import type { ActivityRow, CategoryRow, Classification, Recurrence } from "../types";

/**
 * The owner's real weekly routine. This is the single source of truth used by
 * the first-login bootstrap (and by the automated tests).
 */

export const CATEGORY_SEED: Omit<CategoryRow, "id" | "user_id">[] = [
  { key: "spiritual", name: "Spiritual", color: "#8B5CF6", icon: "book-open", priority_rank: 1, notify: true,
    default_reminders: [{ anchor: "start", offset_minutes: -5 }, { anchor: "start", offset_minutes: 0 }] },
  { key: "gym", name: "Gym", color: "#22A06B", icon: "dumbbell", priority_rank: 4, notify: true,
    default_reminders: [{ anchor: "start", offset_minutes: -15 }, { anchor: "start", offset_minutes: 0 }] },
  { key: "keyboard", name: "Keyboard", color: "#3B82F6", icon: "music", priority_rank: 3, notify: true,
    default_reminders: [{ anchor: "start", offset_minutes: -30 }, { anchor: "start", offset_minutes: 0 }] },
  { key: "office", name: "Office", color: "#F97316", icon: "briefcase", priority_rank: 3, notify: true,
    default_reminders: [{ anchor: "start", offset_minutes: -30 }, { anchor: "start", offset_minutes: 0 }] },
  { key: "podcast", name: "Podcast", color: "#EC4899", icon: "mic", priority_rank: 5, notify: true,
    default_reminders: [{ anchor: "start", offset_minutes: -15 }, { anchor: "start", offset_minutes: 0 }] },
  { key: "personal", name: "Personal", color: "#6B7280", icon: "user", priority_rank: 4, notify: true,
    default_reminders: [{ anchor: "start", offset_minutes: -10 }, { anchor: "start", offset_minutes: 0 }] },
  { key: "travel", name: "Travel", color: "#14B8A6", icon: "plane", priority_rank: 3, notify: true,
    default_reminders: [{ anchor: "start", offset_minutes: -120 }, { anchor: "start", offset_minutes: -60 }, { anchor: "start", offset_minutes: 0 }] },
  { key: "events", name: "Events", color: "#D4A017", icon: "star", priority_rank: 3, notify: true,
    default_reminders: [{ anchor: "start", offset_minutes: -60 }, { anchor: "start", offset_minutes: -15 }, { anchor: "start", offset_minutes: 0 }] },
];

export const HABIT_SEED = [
  { key: "devotion", name: "Bible devotion", icon: "book-open", color: "#8B5CF6", target_per_week: 7 },
  { key: "prayer", name: "Prayer", icon: "heart", color: "#A78BFA", target_per_week: 7 },
  { key: "gym", name: "Gym", icon: "dumbbell", color: "#22A06B", target_per_week: 4 },
  { key: "keyboard-lessons", name: "Keyboard lessons", icon: "graduation-cap", color: "#3B82F6", target_per_week: 3 },
  { key: "keyboard-practice", name: "Keyboard practice", icon: "music", color: "#60A5FA", target_per_week: 5 },
  { key: "office", name: "Office training", icon: "briefcase", color: "#F97316", target_per_week: 5 },
  { key: "podcast", name: "Podcast work", icon: "mic", color: "#EC4899", target_per_week: 3 },
  { key: "sleep", name: "Sleep consistency", icon: "moon", color: "#64748B", target_per_week: 7 },
] as const;

export const PODCAST_STAGES = [
  "Idea", "Researching", "Scripting", "Ready to Record", "Recording", "Editing", "Ready to Publish", "Published",
];

export const OFFICE_START_DATE = "2026-10-19";

export interface SeedRule { anchor: "start" | "end"; offset_minutes: number; message?: string; enabled?: boolean }

export interface SeedActivity {
  slug: string;
  title: string;
  description?: string;
  category: string;
  habit?: (typeof HABIT_SEED)[number]["key"];
  classification: Classification;
  priority: number;
  start_time: string;
  duration_minutes: number;
  recurrence: Recurrence;
  group_key?: string;
  kind?: string;
  /** earliest start date (e.g. office training) */
  not_before?: string;
  rules: SeedRule[];
  checklist?: string[];
}

const GYM_DAYS = [1, 3, 5, 6];

export const ACTIVITY_SEED: SeedActivity[] = [
  {
    slug: "devotion", title: "Bible study & prayer", category: "spiritual", habit: "devotion",
    description: "Bible study, prayer, worship, meditation on Scripture, and reflection.",
    classification: "essential", priority: 1, start_time: "05:00", duration_minutes: 60,
    recurrence: { freq: "daily" }, kind: "routine", group_key: "devotion",
    checklist: ["Read today's passage", "Prayer", "Worship", "Meditate on Scripture", "Write a reflection"],
    rules: [
      { anchor: "start", offset_minutes: -5, message: "Your time with God begins in five minutes." },
      { anchor: "start", offset_minutes: 0, message: "Good morning! It's time for Bible study and prayer." },
      { anchor: "end", offset_minutes: 0, message: "Have you completed your devotion? Record today's reflection." },
    ],
  },
  {
    slug: "gym-prepare", title: "Prepare for the gym", category: "gym", classification: "flexible", priority: 4,
    start_time: "06:00", duration_minutes: 30, recurrence: { freq: "weekly", by_weekday: GYM_DAYS },
    group_key: "gym-morning", kind: "routine",
    checklist: ["Water bottle", "Towel", "Workout clothes", "Pre-workout snack"],
    rules: [{ anchor: "start", offset_minutes: 15, message: "Get ready for the gym." }],
  },
  {
    slug: "gym-travel", title: "Travel to the gym", category: "gym", classification: "flexible", priority: 4,
    start_time: "06:30", duration_minutes: 30, recurrence: { freq: "weekly", by_weekday: GYM_DAYS },
    group_key: "gym-morning", kind: "routine",
    rules: [{ anchor: "start", offset_minutes: 0, message: "Time to leave for the gym." }],
  },
  {
    slug: "gym-workout", title: "Gym workout", category: "gym", habit: "gym", classification: "flexible", priority: 4,
    start_time: "07:00", duration_minutes: 60, recurrence: { freq: "weekly", by_weekday: GYM_DAYS },
    group_key: "gym-morning", kind: "routine",
    rules: [
      { anchor: "start", offset_minutes: 0, message: "Your workout begins now." },
      { anchor: "end", offset_minutes: 0, message: "Great work! Time to return home and recover." },
    ],
  },
  {
    slug: "gym-return", title: "Return home", category: "gym", classification: "flexible", priority: 4,
    start_time: "08:00", duration_minutes: 30, recurrence: { freq: "weekly", by_weekday: GYM_DAYS },
    group_key: "gym-morning", kind: "routine", rules: [],
  },
  {
    slug: "gym-recovery", title: "Shower, breakfast & recovery", category: "gym", classification: "flexible", priority: 4,
    start_time: "08:30", duration_minutes: 60, recurrence: { freq: "weekly", by_weekday: GYM_DAYS },
    group_key: "gym-morning", kind: "routine", rules: [],
  },
  {
    slug: "keyboard-lesson-mon", title: "Keyboard lesson", category: "keyboard", habit: "keyboard-lessons",
    classification: "fixed", priority: 3, start_time: "10:00", duration_minutes: 120,
    recurrence: { freq: "weekly", by_weekday: [1] }, kind: "appointment",
    rules: [
      { anchor: "start", offset_minutes: -30, message: "Your keyboard lesson starts in 30 minutes." },
      { anchor: "start", offset_minutes: 0, message: "Time for your keyboard lesson." },
    ],
  },
  {
    slug: "keyboard-lesson-tue-thu", title: "Keyboard lesson", category: "keyboard", habit: "keyboard-lessons",
    classification: "fixed", priority: 3, start_time: "13:00", duration_minutes: 120,
    recurrence: { freq: "weekly", by_weekday: [2, 4] }, kind: "appointment",
    rules: [
      { anchor: "start", offset_minutes: -30, message: "Your keyboard lesson starts in 30 minutes." },
      { anchor: "start", offset_minutes: 0, message: "Time for your keyboard lesson." },
    ],
  },
  ...(
    [
      ["keyboard-practice-mon", "13:00", [1]],
      ["keyboard-practice-wed-fri", "10:00", [3, 5]],
      ["keyboard-practice-thu", "09:00", [4]],
      ["keyboard-practice-sat", "11:00", [6]],
    ] as const
  ).map(
    ([slug, time, days]): SeedActivity => ({
      slug, title: "Keyboard practice", category: "keyboard", habit: "keyboard-practice",
      classification: "flexible", priority: 4, start_time: time, duration_minutes: 60,
      recurrence: { freq: "weekly", by_weekday: [...days] }, kind: "block",
      rules: [
        { anchor: "start", offset_minutes: -10, message: "Keyboard practice starts in 10 minutes." },
        { anchor: "start", offset_minutes: 0, message: "Time to practise the keyboard." },
      ],
    }),
  ),
  {
    slug: "office", title: "Office training", category: "office", habit: "office",
    classification: "fixed", priority: 3, start_time: "16:00", duration_minutes: 180,
    recurrence: { freq: "weekly", by_weekday: [1, 2, 3, 4, 5] }, kind: "appointment", not_before: OFFICE_START_DATE,
    rules: [
      { anchor: "start", offset_minutes: -30, message: "Office training starts in 30 minutes." },
      { anchor: "start", offset_minutes: 0, message: "Time for office training." },
      { anchor: "end", offset_minutes: 0, message: "Office training is done for today. Well done!" },
    ],
  },
  {
    slug: "podcast-research", title: "Podcast research & scripting", category: "podcast", habit: "podcast",
    classification: "flexible", priority: 5, start_time: "09:00", duration_minutes: 120,
    recurrence: { freq: "weekly", by_weekday: [2] }, kind: "block",
    rules: [
      { anchor: "start", offset_minutes: -15, message: "Podcast research & scripting starts in 15 minutes." },
      { anchor: "start", offset_minutes: 0, message: "Time for podcast research & scripting." },
    ],
  },
  {
    slug: "podcast-planning", title: "Podcast planning & preparation", category: "podcast", habit: "podcast",
    classification: "flexible", priority: 5, start_time: "11:00", duration_minutes: 60,
    recurrence: { freq: "weekly", by_weekday: [5] }, kind: "block",
    rules: [
      { anchor: "start", offset_minutes: -15, message: "Podcast planning starts in 15 minutes." },
      { anchor: "start", offset_minutes: 0, message: "Time for podcast planning & preparation." },
    ],
  },
  {
    slug: "podcast-recording", title: "Podcast recording & editing", category: "podcast", habit: "podcast",
    classification: "flexible", priority: 5, start_time: "13:00", duration_minutes: 120,
    recurrence: { freq: "weekly", by_weekday: [6] }, kind: "block",
    rules: [
      { anchor: "start", offset_minutes: -15, message: "Podcast recording starts in 15 minutes." },
      { anchor: "start", offset_minutes: 0, message: "Time to record and edit your podcast." },
    ],
  },
  {
    slug: "weekly-review", title: "Weekly review & planning", category: "personal",
    classification: "flexible", priority: 2, start_time: "16:00", duration_minutes: 60,
    recurrence: { freq: "weekly", by_weekday: [7] }, kind: "routine",
    rules: [{ anchor: "start", offset_minutes: 0, message: "Time to review your week and plan the next one." }],
  },
];

/** Build concrete activity rows for a user, starting the routine on `startDate`. */
export function buildSeedActivities(
  startDate: string,
  categoryIdByKey: Record<string, string>,
  habitIdByKey: Record<string, string>,
  newId: () => string,
): { activity: Omit<ActivityRow, "user_id">; rules: SeedRule[] }[] {
  return ACTIVITY_SEED.map((s) => {
    const start = s.not_before && s.not_before > startDate ? s.not_before : startDate;
    return {
      activity: {
        id: newId(),
        title: s.title,
        description: s.description ?? null,
        notes: null,
        category_id: categoryIdByKey[s.category] ?? null,
        location: null,
        kind: s.kind ?? "routine",
        classification: s.classification,
        priority: s.priority,
        start_date: start,
        start_time: s.start_time,
        duration_minutes: s.duration_minutes,
        all_day: false,
        end_date: null,
        timezone: null,
        recurrence: s.recurrence,
        prep_minutes: 0,
        travel_minutes: 0,
        recovery_minutes: 0,
        checklist: (s.checklist ?? []).map((text, i) => ({ id: `c${i}`, text })),
        group_key: s.group_key ?? null,
        habit_id: s.habit ? habitIdByKey[s.habit] ?? null : null,
        status: "active",
        source: "seed",
        trip_id: null,
        series_parent_id: null,
        dedupe_key: `seed:${s.slug}`,
      },
      rules: s.rules,
    };
  });
}
