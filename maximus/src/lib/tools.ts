/** Shared types and helpers for the Tools section (client- and server-safe). */

export type FocusKind = "pomodoro" | "break" | "deep_work" | "stopwatch" | "countdown" | "focus";
export type FocusSession = {
  id: string; user_id: string; kind: FocusKind; label: string | null; task_id: string | null; goal_id: string | null;
  planned_seconds: number | null; started_at: string; paused_at: string | null; paused_seconds: number; ended_at: string | null;
  status: "running" | "paused" | "completed" | "abandoned"; interruptions: number; notes: string | null; room_id: string | null; created_at: string;
};
export type TimerPrefs = { work_minutes: number; short_break: number; long_break: number; long_every: number; sound: boolean; vibrate: boolean };
export const DEFAULT_PREFS: TimerPrefs = { work_minutes: 25, short_break: 5, long_break: 15, long_every: 4, sound: true, vibrate: true };

export type ToolGoal = {
  id: string; user_id: string; title: string; description: string | null; category: string;
  horizon: "daily" | "weekly" | "monthly" | "quarterly" | "personal"; start_date: string; deadline: string | null;
  priority: 1 | 2 | 3; target: number | null; unit: string | null; progress: number; status: "active" | "completed" | "abandoned";
  completed_at: string | null; remind_at: string | null; created_at: string;
};
export type Habit = { id: string; name: string; icon: string | null; days: number[]; reminder_time: string | null; archived: boolean; created_at: string };

export const GOAL_CATEGORIES = [
  { key: "business", label: "Business" }, { key: "prospecting", label: "Prospecting" }, { key: "sales", label: "Sales" },
  { key: "team", label: "Team building" }, { key: "learning", label: "Learning" }, { key: "personal", label: "Personal" },
  { key: "health", label: "Health" }, { key: "finance", label: "Finance" }, { key: "other", label: "Other" },
] as const;
export const HORIZONS = [
  { key: "daily", label: "Daily" }, { key: "weekly", label: "Weekly" }, { key: "monthly", label: "Monthly" },
  { key: "quarterly", label: "Quarterly" }, { key: "personal", label: "Personal development" },
] as const;
export const BLOCK_CATEGORIES = [
  { key: "work", label: "Work", color: "#305ee6" }, { key: "prospecting", label: "Prospecting", color: "#7c3aed" },
  { key: "follow_up", label: "Follow-ups", color: "#0e7490" }, { key: "learning", label: "Learning", color: "#4f9a10" },
  { key: "meeting", label: "Meeting", color: "#b45309" }, { key: "personal", label: "Personal", color: "#db2777" },
  { key: "break", label: "Break", color: "#64748b" },
] as const;

/** Seconds actually focused (excludes pauses), computed from server timestamps and a clock offset. */
export function elapsedSeconds(s: Pick<FocusSession, "started_at" | "paused_at" | "paused_seconds" | "ended_at" | "status">, nowMs = Date.now()): number {
  const end = s.ended_at ? new Date(s.ended_at).getTime() : s.status === "paused" && s.paused_at ? new Date(s.paused_at).getTime() : nowMs;
  return Math.max(0, Math.floor((end - new Date(s.started_at).getTime()) / 1000) - s.paused_seconds);
}

export function fmtClock(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const mm = String(m).padStart(2, "0"), ss = String(sec).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function fmtMinutes(mins: number): string {
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60), m = Math.round(mins % 60);
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Current streak of consecutive due days a habit was done, ending today (or yesterday if today isn't done yet). */
export function habitStreak(days: number[], checks: Set<string>, today: string): number {
  const d = new Date(`${today}T12:00:00Z`);
  let streak = 0;
  if (!checks.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  for (let i = 0; i < 400; i++) {
    const iso = d.toISOString().slice(0, 10);
    const dow = d.getUTCDay() || 7;
    if (days.includes(dow)) {
      if (checks.has(iso)) streak++;
      else break;
    }
    d.setUTCDate(d.getUTCDate() - 1);
  }
  return streak;
}

export const MOODS = [
  { emoji: "😞", label: "Tough" }, { emoji: "😕", label: "Meh" }, { emoji: "🙂", label: "OK" }, { emoji: "😀", label: "Good" }, { emoji: "🤩", label: "Great" },
] as const;

/** Consecutive days (ending today, or yesterday if today has nothing yet) that appear in the set. */
export function dayStreak(days: Set<string>, today: string): { current: number; best: number } {
  const d = new Date(`${today}T12:00:00Z`);
  if (!days.has(today)) d.setUTCDate(d.getUTCDate() - 1);
  let current = 0;
  while (days.has(d.toISOString().slice(0, 10))) { current++; d.setUTCDate(d.getUTCDate() - 1); }
  let best = 0, run = 0, prev: number | null = null;
  for (const iso of [...days].sort()) {
    const t = new Date(`${iso}T12:00:00Z`).getTime();
    run = prev !== null && t - prev === 86400000 ? run + 1 : 1;
    best = Math.max(best, run);
    prev = t;
  }
  return { current, best };
}
