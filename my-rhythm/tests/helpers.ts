import { randomUUID } from "node:crypto";
import { CATEGORY_SEED, HABIT_SEED, buildSeedActivities } from "@/lib/seed/routine";
import type { CategoryRow, Preferences, Profile, ScheduleData, ActivityRow, ReminderRuleRow } from "@/lib/types";

export const PREFS: Preferences = {
  theme: "system",
  notifications_enabled: true,
  bedtime_reminders_enabled: true,
  wind_down_minutes: 30,
  daily_agenda_enabled: true,
  daily_agenda_time: "04:45",
  weekly_review_enabled: true,
  in_app_sound_enabled: true,
  in_app_sound: "chime",
  ai_enabled: true,
  max_daily_hours: 11,
  min_buffer_minutes: 15,
  focus_hours: [{ days: [1, 2, 3, 4, 5, 6], start: "09:00", end: "12:00" }],
  protected_rest: [{ days: [7], start: "06:00", end: "16:00", label: "Church, family & rest" }],
  priorities: [],
};

export const PROFILE: Profile = {
  id: "u1",
  display_name: "Xavier",
  timezone: "Africa/Lagos",
  wake_time: "05:00",
  bedtime: "21:00",
  seeded_at: null,
};

export function seededData(startDate = "2026-10-12"): ScheduleData & { rules: ReminderRuleRow[] } {
  const categories: CategoryRow[] = CATEGORY_SEED.map((c) => ({ ...c, id: randomUUID() }));
  const catIds = Object.fromEntries(categories.map((c) => [c.key, c.id]));
  const habitIds = Object.fromEntries(HABIT_SEED.map((h) => [h.key, randomUUID()]));
  const built = buildSeedActivities(startDate, catIds, habitIds, randomUUID);
  const activities = built.map((b) => b.activity as ActivityRow);
  const rules: ReminderRuleRow[] = built.flatMap((b) =>
    b.rules.map((r) => ({
      id: randomUUID(), activity_id: b.activity.id, anchor: r.anchor, offset_minutes: r.offset_minutes,
      message: r.message ?? null, enabled: r.enabled ?? true,
    })),
  );
  return { profile: PROFILE, preferences: PREFS, categories, activities, exceptions: [], completions: [], rules };
}
