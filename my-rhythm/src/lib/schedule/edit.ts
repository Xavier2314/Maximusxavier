import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { z } from "zod";
import { HttpError, must } from "../api";
import type { ActivityRow, ExceptionRow } from "../types";
import { ChangeRecorder, setException } from "./apply";
import { RecurrenceSchema, dedupeKeyFor } from "./draft";

export const ActivityPatchSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().max(5000).nullable(),
    notes: z.string().max(5000).nullable(),
    category_id: z.string().uuid().nullable(),
    location: z.string().max(300).nullable(),
    kind: z.string(),
    classification: z.enum(["fixed", "flexible", "essential", "optional"]),
    priority: z.number().int().min(1).max(5),
    start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    start_time: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable(),
    duration_minutes: z.number().int().min(0).max(60 * 24 * 31),
    all_day: z.boolean(),
    end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    timezone: z.string().nullable(),
    recurrence: RecurrenceSchema.nullable(),
    prep_minutes: z.number().int().min(0).max(1440),
    travel_minutes: z.number().int().min(0).max(1440),
    recovery_minutes: z.number().int().min(0).max(1440),
    checklist: z.array(z.object({ id: z.string(), text: z.string().max(200), done: z.boolean().optional() })).max(50),
    habit_id: z.string().uuid().nullable(),
  })
  .partial();
export type ActivityPatch = z.infer<typeof ActivityPatchSchema>;

export type EditScope = "all" | "this" | "following";

async function loadActivity(sb: SupabaseClient, id: string): Promise<ActivityRow> {
  const a = must(await sb.from("activities").select("*").eq("id", id).maybeSingle(), "load activity") as ActivityRow | null;
  if (!a) throw new HttpError(404, "Activity not found");
  return a;
}

function withDedupe(a: ActivityRow): ActivityRow {
  return { ...a, dedupe_key: a.source === "seed" && a.dedupe_key.startsWith("seed:") ? a.dedupe_key : dedupeKeyFor({ ...a, start_time: a.start_time }) };
}

/** Edit a whole series, a single occurrence, or this-and-following. */
export async function editActivity(
  sb: SupabaseClient,
  userId: string,
  id: string,
  scope: EditScope,
  patch: ActivityPatch,
  occurrence?: { date: string; start?: string; end?: string },
) {
  const a = await loadActivity(sb, id);
  const rec = new ChangeRecorder(sb, userId);

  if (scope === "this" || !a.recurrence) {
    if (scope === "this" && a.recurrence) {
      if (!occurrence?.date) throw new HttpError(400, "Occurrence date required");
      const tz = a.timezone || (await profileTz(sb, userId));
      let start = occurrence.start;
      let end = occurrence.end;
      if (!start) {
        const t = patch.start_time ?? a.start_time ?? "00:00";
        const s = DateTime.fromISO(`${occurrence.date}T${t.slice(0, 5)}`, { zone: tz });
        start = s.toISO()!;
        end = s.plus({ minutes: patch.duration_minutes ?? a.duration_minutes }).toISO()!;
      }
      await setException(sb, userId, {
        user_id: userId, activity_id: a.id, occurrence_date: occurrence.date, kind: "modified",
        start_at: start, end_at: end!, title: patch.title && patch.title !== a.title ? patch.title : null, note: null,
      } as Omit<ExceptionRow, "id">, rec, `Changed “${a.title}” on ${occurrence.date} only`);
      return { batchId: await rec.flush() };
    }
    const next = withDedupe({ ...a, ...patch } as ActivityRow);
    const after = must(await sb.from("activities").update({ ...patch, dedupe_key: next.dedupe_key }).eq("id", a.id).select().single(), "update activity");
    rec.add("activities", a.id, "update", a, after, `Updated “${a.title}”`);
    return { batchId: await rec.flush() };
  }

  if (scope === "all") {
    const next = withDedupe({ ...a, ...patch } as ActivityRow);
    const after = must(await sb.from("activities").update({ ...patch, dedupe_key: next.dedupe_key }).eq("id", a.id).select().single(), "update series");
    rec.add("activities", a.id, "update", a, after, `Updated every “${a.title}”`);
    return { batchId: await rec.flush() };
  }

  // this and following → split the series
  if (!occurrence?.date) throw new HttpError(400, "Occurrence date required");
  if (occurrence.date <= a.start_date) return editActivity(sb, userId, id, "all", patch);
  const until = DateTime.fromISO(occurrence.date).minus({ days: 1 }).toISODate()!;
  const oldAfter = must(
    await sb.from("activities").update({ recurrence: { ...a.recurrence, until } }).eq("id", a.id).select().single(),
    "end old series",
  );
  rec.add("activities", a.id, "update", a, oldAfter, `Ended “${a.title}” series on ${until}`);
  const fresh = withDedupe({
    ...a, ...patch, id: randomUUID(), start_date: occurrence.date, series_parent_id: a.id,
    recurrence: patch.recurrence ?? { ...a.recurrence!, until: a.recurrence!.until ?? null },
  } as ActivityRow);
  delete (fresh as Partial<ActivityRow>).created_at;
  delete (fresh as Partial<ActivityRow>).updated_at;
  if (fresh.dedupe_key.startsWith("seed:")) fresh.dedupe_key = `${fresh.dedupe_key}:${occurrence.date}`;
  const created = must(await sb.from("activities").insert(fresh).select().single(), "create new series") as ActivityRow;
  rec.add("activities", created.id, "insert", null, created, `New “${created.title}” series from ${occurrence.date}`);
  const rules = must(await sb.from("reminder_rules").select("anchor,offset_minutes,message,enabled").eq("activity_id", a.id), "rules") as object[];
  if (rules.length) await sb.from("reminder_rules").insert(rules.map((r) => ({ ...r, user_id: userId, activity_id: created.id })));
  return { batchId: await rec.flush(), newActivityId: created.id };
}

export async function deleteActivity(sb: SupabaseClient, userId: string, id: string, scope: EditScope, date?: string) {
  const a = await loadActivity(sb, id);
  const rec = new ChangeRecorder(sb, userId);
  if (scope === "this" && a.recurrence) {
    if (!date) throw new HttpError(400, "Occurrence date required");
    await setException(sb, userId, {
      user_id: userId, activity_id: a.id, occurrence_date: date, kind: "cancelled", start_at: null, end_at: null, title: null, note: "Deleted",
    } as Omit<ExceptionRow, "id">, rec, `Removed “${a.title}” on ${date}`);
  } else if (scope === "following" && a.recurrence && date && date > a.start_date) {
    const until = DateTime.fromISO(date).minus({ days: 1 }).toISODate()!;
    const after = must(await sb.from("activities").update({ recurrence: { ...a.recurrence, until } }).eq("id", a.id).select().single(), "end series");
    rec.add("activities", a.id, "update", a, after, `Ended “${a.title}” from ${date}`);
  } else {
    const after = must(await sb.from("activities").update({ status: "cancelled" }).eq("id", a.id).select().single(), "cancel activity");
    rec.add("activities", a.id, "update", a, after, `Deleted “${a.title}”`);
  }
  return { batchId: await rec.flush() };
}

export async function duplicateActivity(sb: SupabaseClient, userId: string, id: string, date?: string) {
  const a = await loadActivity(sb, id);
  const rec = new ChangeRecorder(sb, userId);
  const copy = withDedupe({
    ...a, id: randomUUID(), title: `${a.title} (copy)`, start_date: date ?? a.start_date, recurrence: date ? null : a.recurrence,
    source: "manual", series_parent_id: null,
  } as ActivityRow);
  delete (copy as Partial<ActivityRow>).created_at;
  delete (copy as Partial<ActivityRow>).updated_at;
  const created = must(await sb.from("activities").insert(copy).select().single(), "duplicate") as ActivityRow;
  rec.add("activities", created.id, "insert", null, created, `Duplicated “${a.title}”`);
  const rules = must(await sb.from("reminder_rules").select("anchor,offset_minutes,message,enabled").eq("activity_id", a.id), "rules") as object[];
  if (rules.length) await sb.from("reminder_rules").insert(rules.map((r) => ({ ...r, user_id: userId, activity_id: created.id })));
  return { batchId: await rec.flush(), activity: created };
}

async function profileTz(sb: SupabaseClient, userId: string) {
  const p = must(await sb.from("profiles").select("timezone").eq("id", userId).maybeSingle(), "tz") as { timezone: string } | null;
  return p?.timezone ?? "Africa/Lagos";
}
