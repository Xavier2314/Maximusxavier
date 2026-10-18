"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import type { FocusSession } from "@/lib/tools";
import { friendlyError } from "@/lib/utils";

type Result<T = undefined> = { ok: boolean; message: string; data?: T };
const uuid = z.string().uuid();

async function me() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return { supabase, user };
}

// ---------------------------------------------------------------------------
// Focus sessions. Elapsed time always comes from timestamps set on the server.
// ---------------------------------------------------------------------------
const startSchema = z.object({
  kind: z.enum(["pomodoro", "break", "deep_work", "stopwatch", "countdown", "focus"]),
  planned_seconds: z.number().int().min(1).max(86400).nullable(),
  label: z.string().trim().max(160).nullable().optional(),
  task_id: uuid.nullable().optional(),
  goal_id: uuid.nullable().optional(),
  room_id: uuid.nullable().optional(),
});

export async function startSessionAction(input: z.input<typeof startSchema>): Promise<Result<{ session: FocusSession; now: string }>> {
  const parsed = startSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid timer settings." };
  const { supabase, user } = await me();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { data, error } = await supabase.from("focus_sessions").insert({ ...parsed.data, label: parsed.data.label || null })
    .select("*").single<FocusSession>();
  if (error) {
    return { ok: false, message: error.code === "23505" ? "You already have a timer running. Finish or stop it first." : friendlyError(error) };
  }
  return { ok: true, message: "Started.", data: { session: data, now: new Date().toISOString() } };
}

async function loadOwn(id: string) {
  const { supabase, user } = await me();
  if (!user) return { supabase, s: null };
  const { data } = await supabase.from("focus_sessions").select("*").eq("id", id).eq("user_id", user.id).maybeSingle<FocusSession>();
  return { supabase, s: data };
}

export async function pauseSessionAction(id: string): Promise<Result<{ session: FocusSession }>> {
  const { supabase, s } = await loadOwn(id);
  if (!s || s.status !== "running") return { ok: false, message: "This timer isn't running." };
  const { data, error } = await supabase.from("focus_sessions").update({ status: "paused", paused_at: new Date().toISOString() })
    .eq("id", id).select("*").single<FocusSession>();
  if (error) return { ok: false, message: friendlyError(error) };
  return { ok: true, message: "Paused.", data: { session: data } };
}

export async function resumeSessionAction(id: string): Promise<Result<{ session: FocusSession }>> {
  const { supabase, s } = await loadOwn(id);
  if (!s || s.status !== "paused" || !s.paused_at) return { ok: false, message: "This timer isn't paused." };
  const extra = Math.max(0, Math.round((Date.now() - new Date(s.paused_at).getTime()) / 1000));
  const { data, error } = await supabase.from("focus_sessions")
    .update({ status: "running", paused_at: null, paused_seconds: s.paused_seconds + extra }).eq("id", id).select("*").single<FocusSession>();
  if (error) return { ok: false, message: friendlyError(error) };
  return { ok: true, message: "Resumed.", data: { session: data } };
}

export async function finishSessionAction(id: string, outcome: "completed" | "abandoned", extras?: { interruptions?: number; notes?: string }):
  Promise<Result<{ session: FocusSession }>> {
  const { supabase, s } = await loadOwn(id);
  if (!s || (s.status !== "running" && s.status !== "paused")) return { ok: false, message: "This timer has already ended." };
  let now = Date.now();
  const pausedExtra = s.status === "paused" && s.paused_at ? Math.round((now - new Date(s.paused_at).getTime()) / 1000) : 0;
  // A timed session that ran out while the app was closed ends at its planned finish, not when it was reopened.
  if (outcome === "completed" && s.planned_seconds) {
    const plannedEnd = new Date(s.started_at).getTime() + (s.planned_seconds + s.paused_seconds + pausedExtra) * 1000;
    now = Math.min(now, plannedEnd);
  }
  const { data, error } = await supabase.from("focus_sessions").update({
    status: outcome, ended_at: new Date(now).toISOString(), paused_at: null, paused_seconds: s.paused_seconds + pausedExtra,
    ...(extras?.interruptions !== undefined ? { interruptions: Math.min(500, Math.max(0, extras.interruptions)) } : {}),
    ...(extras?.notes !== undefined ? { notes: extras.notes.slice(0, 1000) || null } : {}),
  }).eq("id", id).select("*").single<FocusSession>();
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools", "layout");
  return { ok: true, message: outcome === "completed" ? "Session saved." : "Session stopped.", data: { session: data } };
}

export async function addInterruptionAction(id: string): Promise<Result> {
  const { supabase, s } = await loadOwn(id);
  if (!s) return { ok: false, message: "Timer not found." };
  const { error } = await supabase.from("focus_sessions").update({ interruptions: Math.min(500, s.interruptions + 1) }).eq("id", id);
  return error ? { ok: false, message: friendlyError(error) } : { ok: true, message: "Interruption noted." };
}

export async function saveTimerPrefsAction(prefs: { work_minutes: number; short_break: number; long_break: number; long_every: number; sound: boolean; vibrate: boolean }): Promise<Result> {
  const parsed = z.object({
    work_minutes: z.number().int().min(5).max(180), short_break: z.number().int().min(1).max(60),
    long_break: z.number().int().min(1).max(90), long_every: z.number().int().min(2).max(12), sound: z.boolean(), vibrate: z.boolean(),
  }).safeParse(prefs);
  if (!parsed.success) return { ok: false, message: "Check the timer settings." };
  const { supabase, user } = await me();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("timer_prefs").upsert({ user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() });
  return error ? { ok: false, message: friendlyError(error) } : { ok: true, message: "Settings saved." };
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------
const goalSchema = z.object({
  id: uuid.optional(),
  title: z.string().trim().min(1, "What's the goal?").max(160),
  description: z.string().trim().max(2000).optional(),
  category: z.enum(["business", "prospecting", "sales", "team", "learning", "personal", "health", "finance", "other"]),
  horizon: z.enum(["daily", "weekly", "monthly", "quarterly", "personal"]),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  priority: z.coerce.number().int().min(1).max(3),
  target: z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().positive().max(1e9).nullable()),
  unit: z.string().trim().max(30).optional(),
  remind_at: z.string().optional(),
});

export async function saveGoalAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = goalSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const v = parsed.data;
  if (v.deadline && v.deadline < v.start_date) return { ok: false, message: "The deadline can't be before the start date." };
  const { supabase, user } = await me();
  if (!user) return { ok: false, message: "Please sign in again." };
  const row = {
    title: v.title, description: v.description || null, category: v.category, horizon: v.horizon, start_date: v.start_date,
    deadline: v.deadline || null, priority: v.priority, target: v.target, unit: v.unit || null,
    remind_at: v.remind_at ? new Date(v.remind_at).toISOString() : null,
  };
  const { error } = v.id ? await supabase.from("tool_goals").update(row).eq("id", v.id) : await supabase.from("tool_goals").insert(row);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools", "layout");
  return { ok: true, message: v.id ? "Goal updated." : "Goal added." };
}

export async function recordProgressAction(goalId: string, progress: number, note?: string, sessionId?: string | null): Promise<Result> {
  if (!uuid.safeParse(goalId).success || !Number.isFinite(progress) || progress < 0) return { ok: false, message: "Enter a number." };
  const { supabase } = await me();
  const { error } = await supabase.rpc("record_goal_progress", { p_goal: goalId, p_progress: progress, p_note: note ?? null, p_session: sessionId ?? null });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools", "layout");
  return { ok: true, message: "Progress saved." };
}

export async function setGoalStatusAction(goalId: string, status: "active" | "abandoned" | "completed"): Promise<Result> {
  const { supabase } = await me();
  const { error } = await supabase.from("tool_goals")
    .update({ status, completed_at: status === "completed" ? new Date().toISOString() : null }).eq("id", goalId);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools", "layout");
  return { ok: true, message: "Updated." };
}

// ---------------------------------------------------------------------------
// Habits
// ---------------------------------------------------------------------------
export async function addHabitAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = z.object({
    name: z.string().trim().min(1, "Name the habit").max(80),
    icon: z.string().max(8).optional(),
    reminder_time: z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal("")),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const days = formData.getAll("days").map(Number).filter((d) => d >= 1 && d <= 7);
  const { supabase } = await me();
  const { error } = await supabase.from("habits").insert({
    name: parsed.data.name, icon: parsed.data.icon || null, reminder_time: parsed.data.reminder_time || null,
    days: days.length ? days : [1, 2, 3, 4, 5, 6, 7],
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools", "layout");
  return { ok: true, message: "Habit added." };
}

export async function toggleHabitAction(habitId: string, date: string, done: boolean): Promise<Result> {
  if (!uuid.safeParse(habitId).success || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, message: "Invalid." };
  const { supabase } = await me();
  const { error } = done
    ? await supabase.from("habit_checks").upsert({ habit_id: habitId, check_date: date })
    : await supabase.from("habit_checks").delete().eq("habit_id", habitId).eq("check_date", date);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools", "layout");
  return { ok: true, message: done ? "Done!" : "Unchecked." };
}

export async function archiveHabitAction(habitId: string): Promise<Result> {
  const { supabase } = await me();
  const { error } = await supabase.from("habits").update({ archived: true }).eq("id", habitId);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools", "layout");
  return { ok: true, message: "Habit archived." };
}

// ---------------------------------------------------------------------------
// Time blocks
// ---------------------------------------------------------------------------
const blockSchema = z.object({
  id: uuid.optional(),
  block_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start_min: z.number().int().min(0).max(1439),
  end_min: z.number().int().min(1).max(1440),
  title: z.string().trim().min(1).max(120),
  category: z.enum(["work", "prospecting", "follow_up", "learning", "meeting", "personal", "break"]),
  done: z.boolean().optional(),
});

export async function saveBlockAction(input: z.input<typeof blockSchema>): Promise<Result> {
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success || parsed.data.end_min <= parsed.data.start_min) return { ok: false, message: "Check the block's times." };
  const { id, ...row } = parsed.data;
  const { supabase } = await me();
  const { error } = id ? await supabase.from("time_blocks").update(row).eq("id", id) : await supabase.from("time_blocks").insert(row);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools/time-blocks");
  return { ok: true, message: "Saved." };
}

export async function deleteBlockAction(id: string): Promise<Result> {
  const { supabase } = await me();
  const { error } = await supabase.from("time_blocks").delete().eq("id", id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools/time-blocks");
  return { ok: true, message: "Removed." };
}

/** Eisenhower matrix: moving a task changes its priority (important) and due date (urgent). */
export async function setTaskQuadrantAction(taskId: string, important: boolean, urgent: boolean, today: string): Promise<Result> {
  if (!uuid.safeParse(taskId).success || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return { ok: false, message: "Invalid." };
  const { supabase, user } = await me();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { data: t } = await supabase.from("tasks").select("due_date, priority").eq("id", taskId).eq("user_id", user.id).maybeSingle();
  if (!t) return { ok: false, message: "Task not found." };
  const plus = (n: number) => { const d = new Date(`${today}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
  const isUrgent = Boolean(t.due_date && t.due_date <= plus(1));
  const due_date = urgent === isUrgent ? t.due_date : urgent ? today : plus(7);
  const priority = important ? 1 : t.priority === 1 ? 2 : t.priority;
  const { error } = await supabase.from("tasks").update({ priority, due_date }).eq("id", taskId);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools/eisenhower");
  revalidatePath("/planner");
  return { ok: true, message: "Moved." };
}

// ---------------------------------------------------------------------------
// Weekly reflection / journal
// ---------------------------------------------------------------------------
export async function saveJournalAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = z.object({
    kind: z.enum(["journal", "reflection"]),
    entry_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mood: z.coerce.number().int().min(1).max(5).optional().or(z.literal("")),
    wins: z.string().max(2000).optional(), challenges: z.string().max(2000).optional(),
    lessons: z.string().max(2000).optional(), next_focus: z.string().max(2000).optional(), body: z.string().max(6000).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check your entry." };
  const v = parsed.data;
  const { supabase, user } = await me();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("journal_entries").upsert({
    user_id: user.id, kind: v.kind, entry_date: v.entry_date, mood: v.mood === "" || v.mood === undefined ? null : v.mood,
    wins: v.wins || null, challenges: v.challenges || null, lessons: v.lessons || null, next_focus: v.next_focus || null, body: v.body || null,
  }, { onConflict: "user_id,kind,entry_date" });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools", "layout");
  return { ok: true, message: "Saved." };
}

// ---------------------------------------------------------------------------
// Brain games
// ---------------------------------------------------------------------------
export async function saveGameScoreAction(input: { game: string; score: number; level?: string | null; duration_ms?: number | null; won?: boolean | null }): Promise<Result<{ best: number }>> {
  const parsed = z.object({
    game: z.string().regex(/^[a-z0-9_]{2,32}$/), score: z.number().int().min(0).max(100000000),
    level: z.string().max(20).nullable().optional(), duration_ms: z.number().int().min(0).max(86400000).nullable().optional(), won: z.boolean().nullable().optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Invalid score." };
  const { supabase, user } = await me();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("game_scores").insert(parsed.data);
  if (error) return { ok: false, message: friendlyError(error) };
  const { data } = await supabase.from("game_scores").select("score").eq("user_id", user.id).eq("game", parsed.data.game)
    .order("score", { ascending: false }).limit(1).maybeSingle();
  revalidatePath(`/tools/brain/${parsed.data.game}`);
  return { ok: true, message: "Score saved.", data: { best: (data?.score as number | undefined) ?? parsed.data.score } };
}
