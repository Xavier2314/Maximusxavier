import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { z } from "zod";
import { HttpError, must } from "../api";
import type { ActivityRow, CompletionRow } from "../types";
import { editActivity } from "./edit";

export const OccurrenceActionSchema = z.object({
  activityId: z.string().uuid(),
  occurrenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  action: z.enum(["start", "complete", "skip", "undo", "snooze", "reschedule"]),
  minutes: z.number().int().min(1).max(240).optional(),
  durationMinutes: z.number().int().min(0).max(1440).optional(),
  notes: z.string().max(5000).optional(),
  newStart: z.string().optional(),
  newEnd: z.string().optional(),
});
export type OccurrenceAction = z.infer<typeof OccurrenceActionSchema>;

/**
 * Start / complete / skip / undo / snooze / reschedule a single occurrence.
 * Completion is ONLY ever recorded here, from an explicit user action.
 */
export async function performOccurrenceAction(sb: SupabaseClient, userId: string, input: OccurrenceAction, now = DateTime.now()) {
  const a = must(await sb.from("activities").select("*").eq("id", input.activityId).maybeSingle(), "activity") as ActivityRow | null;
  if (!a) throw new HttpError(404, "Activity not found");
  const existing = must(
    await sb.from("activity_completions").select("*").eq("activity_id", a.id).eq("occurrence_date", input.occurrenceDate).maybeSingle(),
    "completion",
  ) as CompletionRow | null;

  switch (input.action) {
    case "start": {
      const row = {
        user_id: userId, activity_id: a.id, occurrence_date: input.occurrenceDate, status: "in_progress",
        started_at: now.toUTC().toISO(), completed_at: null,
      };
      return must(await sb.from("activity_completions").upsert(row, { onConflict: "activity_id,occurrence_date" }).select().single(), "start");
    }
    case "complete": {
      const started = existing?.started_at ? DateTime.fromISO(existing.started_at) : null;
      const duration = input.durationMinutes ?? (started ? Math.max(1, Math.round(now.diff(started, "minutes").minutes)) : a.duration_minutes);
      const row = {
        user_id: userId, activity_id: a.id, occurrence_date: input.occurrenceDate, status: "completed",
        started_at: existing?.started_at ?? null, completed_at: now.toUTC().toISO(), duration_minutes: duration,
        notes: input.notes ?? existing?.notes ?? null,
      };
      const saved = must(await sb.from("activity_completions").upsert(row, { onConflict: "activity_id,occurrence_date" }).select().single(), "complete");
      if (a.habit_id) {
        await sb.from("habit_completions").upsert(
          { user_id: userId, habit_id: a.habit_id, completed_on: input.occurrenceDate, minutes: duration, note: "auto:activity" },
          { onConflict: "habit_id,completed_on", ignoreDuplicates: true },
        );
      }
      return saved;
    }
    case "skip": {
      const row = {
        user_id: userId, activity_id: a.id, occurrence_date: input.occurrenceDate, status: "skipped",
        started_at: null, completed_at: null, notes: input.notes ?? null,
      };
      return must(await sb.from("activity_completions").upsert(row, { onConflict: "activity_id,occurrence_date" }).select().single(), "skip");
    }
    case "undo": {
      must(await sb.from("activity_completions").delete().eq("activity_id", a.id).eq("occurrence_date", input.occurrenceDate), "undo");
      if (a.habit_id) {
        await sb.from("habit_completions").delete().eq("habit_id", a.habit_id).eq("completed_on", input.occurrenceDate).eq("note", "auto:activity");
      }
      return { ok: true };
    }
    case "snooze": {
      const minutes = input.minutes ?? 10;
      const fire = now.plus({ minutes });
      const row = {
        user_id: userId, activity_id: a.id, occurrence_date: input.occurrenceDate, kind: "snooze",
        fire_at: fire.toUTC().toISO(), title: `${a.title} (snoozed)`, body: `Reminder: ${a.title}. You snoozed this ${minutes} minutes ago.`,
        url: `/?focus=${encodeURIComponent(`${a.id}:${input.occurrenceDate}`)}`, status: "pending",
        dedupe_key: `snooze:${a.id}:${input.occurrenceDate}:${fire.toMillis()}`,
      };
      return must(await sb.from("scheduled_reminders").insert(row).select().single(), "snooze");
    }
    case "reschedule": {
      if (!input.newStart || !input.newEnd) throw new HttpError(400, "New start and end are required");
      return editActivity(sb, userId, a.id, a.recurrence ? "this" : "all", a.recurrence ? {} : {
        start_date: DateTime.fromISO(input.newStart).setZone(a.timezone || "Africa/Lagos").toISODate()!,
        start_time: DateTime.fromISO(input.newStart).setZone(a.timezone || "Africa/Lagos").toFormat("HH:mm"),
        duration_minutes: Math.round(DateTime.fromISO(input.newEnd).diff(DateTime.fromISO(input.newStart), "minutes").minutes),
      }, { date: input.occurrenceDate, start: input.newStart, end: input.newEnd });
    }
  }
}
