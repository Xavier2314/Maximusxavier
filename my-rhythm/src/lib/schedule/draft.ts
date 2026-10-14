import { z } from "zod";
import { DateTime } from "luxon";
import type { ActivityRow, CategoryRow } from "../types";
import { occurrenceDates } from "./occurrences";
import type { Candidate } from "./conflicts";
import { zonedDateTime } from "../time";

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Use HH:mm");
const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");

export const RecurrenceSchema = z.object({
  freq: z.enum(["daily", "weekly", "monthly", "yearly"]),
  interval: z.number().int().min(1).max(52).optional(),
  by_weekday: z.array(z.number().int().min(1).max(7)).max(7).optional(),
  until: ymd.nullable().optional(),
  count: z.number().int().min(1).max(1000).nullable().optional(),
});

export const ReminderSpecSchema = z.object({
  anchor: z.enum(["start", "end"]).default("start"),
  offset_minutes: z.number().int().min(-10080).max(1440),
  message: z.string().max(200).nullable().optional(),
  enabled: z.boolean().optional(),
});

export const ActivityDraftSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    category_key: z.string().default("personal"),
    kind: z.string().default("event"),
    start_date: ymd,
    start_time: hhmm.nullable().optional(),
    duration_minutes: z.number().int().min(0).max(60 * 24 * 31).default(60),
    all_day: z.boolean().default(false),
    end_date: ymd.nullable().optional(),
    location: z.string().max(300).nullable().optional(),
    description: z.string().max(5000).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    classification: z.enum(["fixed", "flexible", "essential", "optional"]).default("flexible"),
    priority: z.number().int().min(1).max(5).default(3),
    recurrence: RecurrenceSchema.nullable().optional(),
    prep_minutes: z.number().int().min(0).max(1440).default(0),
    travel_minutes: z.number().int().min(0).max(1440).default(0),
    recovery_minutes: z.number().int().min(0).max(1440).default(0),
    reminders: z.array(ReminderSpecSchema).max(10).optional(),
    timezone: z.string().nullable().optional(),
    trip_id: z.string().uuid().nullable().optional(),
    group_key: z.string().nullable().optional(),
    habit_id: z.string().uuid().nullable().optional(),
    checklist: z.array(z.object({ id: z.string(), text: z.string().max(200), done: z.boolean().optional() })).max(50).optional(),
    source: z.enum(["manual", "ai", "voice", "travel", "import"]).default("manual"),
  })
  .refine((d) => d.all_day || !!d.start_time, { message: "A start time is required unless the activity is all-day", path: ["start_time"] });

export type ActivityDraft = z.infer<typeof ActivityDraftSchema>;

export function dedupeKeyFor(d: Pick<ActivityDraft, "title" | "start_date" | "start_time" | "recurrence" | "all_day">): string {
  const t = d.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const r = d.recurrence ? `${d.recurrence.freq}/${d.recurrence.interval ?? 1}/${(d.recurrence.by_weekday ?? []).join("")}` : "once";
  return `${t}|${d.start_date}|${d.all_day ? "allday" : (d.start_time ?? "").slice(0, 5)}|${r}`;
}

export function draftToActivity(
  d: ActivityDraft,
  categories: Pick<CategoryRow, "id" | "key">[],
  id: string,
): Omit<ActivityRow, "user_id"> {
  const cat = categories.find((c) => c.key === d.category_key) ?? categories.find((c) => c.key === "personal");
  return {
    id,
    title: d.title,
    description: d.description ?? null,
    notes: d.notes ?? null,
    category_id: cat?.id ?? null,
    location: d.location ?? null,
    kind: d.kind,
    classification: d.classification,
    priority: d.priority,
    start_date: d.start_date,
    start_time: d.all_day ? null : (d.start_time ?? null),
    duration_minutes: d.all_day ? 0 : d.duration_minutes,
    all_day: d.all_day,
    end_date: d.end_date ?? null,
    timezone: d.timezone ?? null,
    recurrence: d.recurrence ?? null,
    prep_minutes: d.prep_minutes,
    travel_minutes: d.travel_minutes,
    recovery_minutes: d.recovery_minutes,
    checklist: d.checklist ?? [],
    group_key: d.group_key ?? null,
    habit_id: d.habit_id ?? null,
    status: "active",
    source: d.source,
    trip_id: d.trip_id ?? null,
    series_parent_id: null,
    dedupe_key: dedupeKeyFor(d),
  };
}

/** Concrete time blocks a draft would occupy (first N occurrences for recurring drafts). */
export function draftCandidates(d: ActivityDraft, tz: string, horizonDays = 14, max = 20): Candidate[] {
  const zone = d.timezone || tz;
  const pseudo = { start_date: d.start_date, recurrence: d.recurrence ?? null } as ActivityRow;
  const to = DateTime.fromISO(d.start_date).plus({ days: d.recurrence ? horizonDays : 0 }).toISODate()!;
  const dates = occurrenceDates(pseudo, d.start_date, to, zone).slice(0, max);
  return dates.map((date) => {
    if (d.all_day) {
      const s = DateTime.fromISO(date, { zone }).startOf("day");
      const days = d.end_date ? Math.round(DateTime.fromISO(d.end_date).diff(DateTime.fromISO(d.start_date), "days").days) + 1 : 1;
      return { title: d.title, start: s.toISO()!, end: s.plus({ days }).toISO()!, allDay: true };
    }
    const s = zonedDateTime(date, d.start_time!, zone);
    return {
      title: d.title,
      start: s.toISO()!,
      end: s.plus({ minutes: d.duration_minutes }).toISO()!,
      prepMinutes: d.prep_minutes,
      travelMinutes: d.travel_minutes,
      recoveryMinutes: d.recovery_minutes,
      away: d.kind === "trip",
    };
  });
}
