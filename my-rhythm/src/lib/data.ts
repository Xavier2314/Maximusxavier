import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import type {
  ActivityRow,
  CategoryRow,
  CompletionRow,
  ExceptionRow,
  Occurrence,
  Preferences,
  Profile,
  ReminderRuleRow,
  ScheduleData,
} from "./types";
import { HttpError, must } from "./api";
import { expandOccurrences } from "./schedule/occurrences";
import { DEFAULT_TZ } from "./time";

/**
 * Load everything the scheduling engine needs for one user. Works with either
 * the user's RLS client or the service-role client (always filtered by userId).
 */
export async function loadScheduleData(
  sb: SupabaseClient,
  userId: string,
  opts: { completionsFrom?: string; completionsTo?: string } = {},
): Promise<ScheduleData> {
  const completionsQuery = sb.from("activity_completions").select("*").eq("user_id", userId);
  if (opts.completionsFrom) completionsQuery.gte("occurrence_date", opts.completionsFrom);
  if (opts.completionsTo) completionsQuery.lte("occurrence_date", opts.completionsTo);
  const [profile, prefs, categories, activities, exceptions, completions] = await Promise.all([
    sb.from("profiles").select("*").eq("id", userId).maybeSingle(),
    sb.from("user_preferences").select("*").eq("user_id", userId).maybeSingle(),
    sb.from("activity_categories").select("*").eq("user_id", userId).order("priority_rank"),
    sb.from("activities").select("*").eq("user_id", userId).eq("status", "active"),
    sb.from("activity_exceptions").select("*").eq("user_id", userId),
    completionsQuery,
  ]);
  const p = must(profile, "load profile") as Profile | null;
  if (!p) throw new HttpError(409, "Profile not found — open the app once to finish setup.");
  return {
    profile: { ...p, timezone: p.timezone || DEFAULT_TZ },
    preferences: normalizePrefs(must(prefs, "load preferences") as Preferences | null),
    categories: must(categories, "load categories") as CategoryRow[],
    activities: must(activities, "load activities") as ActivityRow[],
    exceptions: must(exceptions, "load exceptions") as ExceptionRow[],
    completions: must(completions, "load completions") as CompletionRow[],
  };
}

export function normalizePrefs(p: Preferences | null): Preferences {
  const base: Preferences = {
    theme: "system", notifications_enabled: true, bedtime_reminders_enabled: true, wind_down_minutes: 30,
    daily_agenda_enabled: true, daily_agenda_time: "04:45", weekly_review_enabled: true, in_app_sound_enabled: true,
    in_app_sound: "chime", ai_enabled: true, max_daily_hours: 11, min_buffer_minutes: 15,
    focus_hours: [], protected_rest: [], priorities: [],
  };
  if (!p) return base;
  return {
    ...base,
    ...p,
    max_daily_hours: Number(p.max_daily_hours ?? 11),
    daily_agenda_time: (p.daily_agenda_time ?? "04:45").slice(0, 5),
  };
}

export async function loadRules(sb: SupabaseClient, userId: string): Promise<ReminderRuleRow[]> {
  return must(await sb.from("reminder_rules").select("*").eq("user_id", userId), "load reminder rules") as ReminderRuleRow[];
}

export type OccState = "completed" | "skipped" | "in_progress" | "missed" | "upcoming" | "now" | "cancelled";

export interface OccurrenceView extends Occurrence {
  state: OccState;
  completion?: CompletionRow | null;
  category?: Pick<CategoryRow, "key" | "name" | "color" | "icon"> | null;
}

/** Attach completion state; "missed" is derived (never stored) from real records only. */
export function decorate(occ: Occurrence[], data: ScheduleData, now: DateTime): OccurrenceView[] {
  const comp = new Map(data.completions.map((c) => [`${c.activity_id}:${c.occurrence_date}`, c]));
  const cats = new Map(data.categories.map((c) => [c.id, c]));
  return occ.map((o) => {
    const c = comp.get(o.key) ?? null;
    const s = DateTime.fromISO(o.start);
    const e = DateTime.fromISO(o.end);
    let state: OccState;
    if (o.status === "cancelled") state = "cancelled";
    else if (c?.status === "completed") state = "completed";
    else if (c?.status === "skipped") state = "skipped";
    else if (c?.status === "in_progress") state = "in_progress";
    else if (now >= s && now < e) state = "now";
    else if (now >= e) state = "missed";
    else state = "upcoming";
    const cat = o.categoryId ? cats.get(o.categoryId) : undefined;
    return { ...o, state, completion: c, category: cat ? { key: cat.key, name: cat.name, color: cat.color, icon: cat.icon } : null };
  });
}

export function occurrencesForDays(data: ScheduleData, from: string, to: string, includeCancelled = false) {
  const tz = data.profile.timezone;
  const s = DateTime.fromISO(from, { zone: tz }).startOf("day");
  const e = DateTime.fromISO(to, { zone: tz }).plus({ days: 1 }).startOf("day");
  return expandOccurrences(data.activities, data.exceptions, s, e, tz, { includeCancelled });
}
