// Shared domain types. Database rows mirror supabase/migrations.

export type Classification = "fixed" | "flexible" | "essential" | "optional";
export type Freq = "daily" | "weekly" | "monthly" | "yearly";

export interface Recurrence {
  freq: Freq;
  interval?: number;
  /** ISO weekdays: 1 = Monday … 7 = Sunday */
  by_weekday?: number[];
  /** inclusive last date (YYYY-MM-DD) */
  until?: string | null;
  count?: number | null;
}

export interface CategoryRow {
  id: string;
  user_id?: string;
  key: string;
  name: string;
  color: string;
  icon: string;
  priority_rank: number;
  notify: boolean;
  default_reminders: { anchor: "start" | "end"; offset_minutes: number; message?: string }[];
}

export interface ActivityRow {
  id: string;
  user_id?: string;
  title: string;
  description: string | null;
  notes: string | null;
  category_id: string | null;
  location: string | null;
  kind: string;
  classification: Classification;
  priority: number;
  start_date: string; // YYYY-MM-DD
  start_time: string | null; // HH:mm[:ss]
  duration_minutes: number;
  all_day: boolean;
  end_date: string | null;
  timezone: string | null;
  recurrence: Recurrence | null;
  prep_minutes: number;
  travel_minutes: number;
  recovery_minutes: number;
  checklist: { id: string; text: string; done?: boolean }[];
  group_key: string | null;
  habit_id: string | null;
  status: "active" | "cancelled" | "archived";
  source: string;
  trip_id: string | null;
  series_parent_id: string | null;
  dedupe_key: string;
  created_at?: string;
  updated_at?: string;
}

export interface ExceptionRow {
  id: string;
  user_id?: string;
  activity_id: string;
  occurrence_date: string;
  kind: "cancelled" | "modified" | "needs_reschedule";
  start_at: string | null;
  end_at: string | null;
  title: string | null;
  note: string | null;
}

export interface CompletionRow {
  id: string;
  activity_id: string;
  occurrence_date: string;
  status: "in_progress" | "completed" | "skipped";
  started_at: string | null;
  completed_at: string | null;
  duration_minutes: number | null;
  notes: string | null;
}

export interface ReminderRuleRow {
  id: string;
  activity_id: string;
  anchor: "start" | "end";
  offset_minutes: number;
  message: string | null;
  enabled: boolean;
}

export interface Preferences {
  theme: "system" | "light" | "dark";
  notifications_enabled: boolean;
  bedtime_reminders_enabled: boolean;
  wind_down_minutes: number;
  daily_agenda_enabled: boolean;
  daily_agenda_time: string;
  weekly_review_enabled: boolean;
  in_app_sound_enabled: boolean;
  in_app_sound: string;
  ai_enabled: boolean;
  max_daily_hours: number;
  min_buffer_minutes: number;
  focus_hours: TimeWindow[];
  protected_rest: TimeWindow[];
  priorities: string[];
  last_scheduler_run_at?: string | null;
}

export interface TimeWindow {
  days: number[];
  start: string; // HH:mm
  end: string; // HH:mm
  label?: string;
}

export interface Profile {
  id: string;
  display_name: string;
  timezone: string;
  wake_time: string;
  bedtime: string;
  seeded_at: string | null;
}

export type OccurrenceStatus = "scheduled" | "cancelled" | "needs_reschedule";
export type CompletionState = "completed" | "skipped" | "in_progress" | "missed" | "upcoming" | "now";

export interface Occurrence {
  key: string; // `${activityId}:${occurrenceDate}`
  activityId: string;
  occurrenceDate: string; // original (series) date — stable identity
  title: string;
  start: string; // ISO with offset
  end: string;
  allDay: boolean;
  timezone: string;
  categoryId: string | null;
  classification: Classification;
  priority: number;
  kind: string;
  location: string | null;
  groupKey: string | null;
  recurring: boolean;
  status: OccurrenceStatus;
  modified: boolean;
  prepMinutes: number;
  travelMinutes: number;
  recoveryMinutes: number;
  exceptionNote?: string | null;
}

export interface ScheduleData {
  profile: Profile;
  preferences: Preferences;
  categories: CategoryRow[];
  activities: ActivityRow[];
  exceptions: ExceptionRow[];
  completions: CompletionRow[];
}
