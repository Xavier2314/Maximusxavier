import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { HttpError, must } from "../api";
import type { ActivityRow, CategoryRow, ExceptionRow, ScheduleData } from "../types";
import { ActivityDraftSchema, draftToActivity, type ActivityDraft } from "./draft";
import { normalizeSelection, type ProposalPayload, type Recommendation } from "./analyze";
import { detectConflicts } from "./conflicts";
import { expandOccurrences } from "./occurrences";

type Entity = "activities" | "activity_exceptions" | "reminder_rules" | "trips";

export class ChangeRecorder {
  readonly batchId = randomUUID();
  private rows: Record<string, unknown>[] = [];
  constructor(private sb: SupabaseClient, private userId: string, private proposalId: string | null = null) {}

  add(entity: Entity, entityId: string, action: "insert" | "update" | "delete", before: unknown, after: unknown, description: string) {
    this.rows.push({
      user_id: this.userId, batch_id: this.batchId, proposal_id: this.proposalId, entity, entity_id: entityId, action,
      before: before ?? null, after: after ?? null, description,
    });
  }

  async flush() {
    if (this.rows.length) must(await this.sb.from("schedule_change_history").insert(this.rows), "write change history");
    return this.batchId;
  }
}

/** Insert an activity + reminder rules (from the draft, else category defaults). */
export async function createActivity(
  sb: SupabaseClient,
  userId: string,
  draft: ActivityDraft,
  categories: CategoryRow[],
  rec: ChangeRecorder,
): Promise<ActivityRow> {
  const row = { ...draftToActivity(draft, categories, randomUUID()), user_id: userId };
  const dup = must(
    await sb.from("activities").select("id,title").eq("user_id", userId).eq("dedupe_key", row.dedupe_key).eq("status", "active").maybeSingle(),
    "duplicate check",
  );
  if (dup) throw new HttpError(409, `“${draft.title}” already exists at that time.`);
  const created = must(await sb.from("activities").insert(row).select().single(), "create activity") as ActivityRow;
  rec.add("activities", created.id, "insert", null, created, `Added “${created.title}”`);

  const cat = categories.find((c) => c.id === created.category_id);
  const specs = draft.reminders ?? cat?.default_reminders ?? [{ anchor: "start", offset_minutes: -10 }, { anchor: "start", offset_minutes: 0 }];
  const unique = new Map(specs.map((s) => [`${s.anchor}:${s.offset_minutes}`, s]));
  if (unique.size) {
    const rules = [...unique.values()].map((s) => ({
      user_id: userId, activity_id: created.id, anchor: s.anchor ?? "start", offset_minutes: s.offset_minutes,
      message: s.message ?? null, enabled: ("enabled" in s ? s.enabled : undefined) ?? true,
    }));
    must(await sb.from("reminder_rules").insert(rules), "create reminder rules");
  }
  return created;
}

/** Upsert an exception for one occurrence, recording before/after for undo. */
export async function setException(
  sb: SupabaseClient,
  userId: string,
  e: Omit<ExceptionRow, "id"> & { id?: string },
  rec: ChangeRecorder,
  description: string,
) {
  const before = must(
    await sb.from("activity_exceptions").select("*").eq("activity_id", e.activity_id).eq("occurrence_date", e.occurrence_date).maybeSingle(),
    "load exception",
  ) as ExceptionRow | null;
  const row = { ...e, user_id: userId };
  delete (row as { id?: string }).id;
  const after = must(
    await sb.from("activity_exceptions").upsert(row, { onConflict: "activity_id,occurrence_date" }).select().single(),
    "save exception",
  ) as ExceptionRow;
  rec.add("activity_exceptions", after.id, before ? "update" : "insert", before, after, description);
  return after;
}

export interface ApplyResult {
  applied: string[];
  failed: { id: string; error: string }[];
  batchId: string | null;
}

/**
 * Apply ONLY the recommendations the user approved. Every change is
 * re-validated against the current calendar first (the calendar may have
 * changed since the proposal was generated).
 */
export async function applyProposal(
  sb: SupabaseClient,
  userId: string,
  proposalId: string,
  payload: ProposalPayload,
  selectedIds: string[],
  data: ScheduleData,
  overrides: Record<string, { draft?: ActivityDraft; newStart?: string; newEnd?: string }> = {},
): Promise<ApplyResult> {
  const ids = normalizeSelection(payload, selectedIds);
  const rec = new ChangeRecorder(sb, userId, proposalId);
  const applied: string[] = [];
  const failed: ApplyResult["failed"] = [];
  const tz = data.profile.timezone;

  // Occurrences being moved/cancelled in this batch shouldn't block each other.
  const releasing = new Set<string>();
  for (const id of ids) {
    const r = payload.recommendations.find((x) => x.id === id)!;
    if (["move_occurrence", "cancel_occurrence", "skip_occurrence"].includes(r.action)) r.targets?.forEach((t) => releasing.add(t.key));
  }

  const ordered = ids
    .map((id) => payload.recommendations.find((x) => x.id === id)!)
    .sort((a, b) => order(a) - order(b));

  for (const r of ordered) {
    try {
      const o = overrides[r.id];
      switch (r.action) {
        case "create_activity": {
          const draft = ActivityDraftSchema.parse(o?.draft ?? r.draft);
          await createActivity(sb, userId, draft, data.categories, rec);
          break;
        }
        case "move_occurrence": {
          for (const t of r.targets ?? []) {
            const newStart = o?.newStart && r.targets!.length === 1 ? o.newStart : t.newStart!;
            const newEnd = o?.newEnd && r.targets!.length === 1 ? o.newEnd : t.newEnd!;
            if (!(DateTime.fromISO(newEnd) > DateTime.fromISO(newStart))) throw new Error("End must be after start");
            // validate against fixed/essential commitments as they are now
            const s = DateTime.fromISO(newStart);
            const existing = expandOccurrences(data.activities, data.exceptions, s.minus({ days: 1 }), s.plus({ days: 1 }), tz);
            const clashes = detectConflicts([{ title: t.title, start: newStart, end: newEnd, replaces: [t.key] }], {
              existing, profile: data.profile, preferences: data.preferences, tz, ignoreKeys: releasing,
            }).filter((c) => c.type === "overlap" && c.occurrence && (c.occurrence.classification === "fixed" || c.occurrence.classification === "essential"));
            if (clashes.length) throw new Error(`New time clashes with ${clashes[0].occurrence!.title}`);
            await setException(sb, userId, {
              user_id: userId, activity_id: t.activityId, occurrence_date: t.occurrenceDate, kind: "modified",
              start_at: newStart, end_at: newEnd, title: null, note: "Moved (approved)",
            } as Omit<ExceptionRow, "id">, rec, `Moved “${t.title}” (${t.occurrenceDate})`);
          }
          break;
        }
        case "cancel_occurrence":
        case "skip_occurrence": {
          for (const t of r.targets ?? []) {
            await setException(sb, userId, {
              user_id: userId, activity_id: t.activityId, occurrence_date: t.occurrenceDate, kind: "cancelled",
              start_at: null, end_at: null, title: null, note: r.action === "skip_occurrence" ? "Skipped (approved)" : "Cancelled (approved)",
            } as Omit<ExceptionRow, "id">, rec, `${r.action === "skip_occurrence" ? "Skipped" : "Cancelled"} “${t.title}” (${t.occurrenceDate})`);
          }
          break;
        }
        case "flag_occurrence": {
          for (const t of r.targets ?? []) {
            await setException(sb, userId, {
              user_id: userId, activity_id: t.activityId, occurrence_date: t.occurrenceDate, kind: "needs_reschedule",
              start_at: null, end_at: null, title: null, note: r.reason.slice(0, 280),
            } as Omit<ExceptionRow, "id">, rec, `Flagged “${t.title}” (${t.occurrenceDate}) as needing rescheduling`);
          }
          break;
        }
        case "note":
          continue;
      }
      applied.push(r.id);
    } catch (e) {
      failed.push({ id: r.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const batchId = applied.length ? await rec.flush() : null;
  return { applied, failed, batchId };
}

function order(r: Recommendation) {
  // release time first (skip/cancel/flag), then moves, then creations
  return { skip_occurrence: 0, cancel_occurrence: 0, flag_occurrence: 1, move_occurrence: 2, create_activity: 3, note: 4 }[r.action];
}

/** Revert every change in a batch (newest first). */
export async function undoBatch(sb: SupabaseClient, userId: string, batchId: string) {
  const rows = must(
    await sb.from("schedule_change_history").select("*").eq("user_id", userId).eq("batch_id", batchId).is("undone_at", null).order("created_at", { ascending: false }),
    "load history",
  ) as { id: string; entity: Entity; entity_id: string; action: string; before: Record<string, unknown> | null }[];
  if (!rows.length) throw new HttpError(404, "Nothing to undo");
  for (const h of rows) {
    if (h.action === "insert") {
      if (h.entity === "activities") must(await sb.from("activities").update({ status: "archived" }).eq("id", h.entity_id), "undo insert");
      else must(await sb.from(h.entity).delete().eq("id", h.entity_id), "undo insert");
    } else if (h.before) {
      const before = { ...h.before };
      delete before.updated_at;
      must(await sb.from(h.entity).upsert(before), "undo change");
    }
  }
  must(await sb.from("schedule_change_history").update({ undone_at: new Date().toISOString() }).eq("batch_id", batchId).eq("user_id", userId), "mark undone");
  return { undone: rows.length };
}
