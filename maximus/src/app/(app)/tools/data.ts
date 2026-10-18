import "server-only";
import type { Viewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_PREFS, type FocusSession, type TimerPrefs } from "@/lib/tools";
import { todayIn } from "@/lib/utils";

export type TimerGoal = { id: string; title: string; progress: number; target: number | null; unit: string | null };
export type TimerTask = { id: string; title: string };

/** Everything a timer page needs: the running session (if any), settings, goals and open tasks. */
export async function loadTimerData(viewer: Viewer) {
  const supabase = await createClient();
  const today = todayIn(viewer.profile.timezone);
  const [{ data: active }, { data: prefs }, { data: goals }, { data: tasks }, { data: todays }] = await Promise.all([
    supabase.from("focus_sessions").select("*").eq("user_id", viewer.id).in("status", ["running", "paused"])
      .order("started_at", { ascending: false }).limit(1).maybeSingle<FocusSession>(),
    supabase.from("timer_prefs").select("*").eq("user_id", viewer.id).maybeSingle<TimerPrefs>(),
    supabase.from("tool_goals").select("id, title, progress, target, unit").eq("user_id", viewer.id).eq("status", "active")
      .order("priority").order("deadline", { ascending: true, nullsFirst: false }).limit(50),
    supabase.from("tasks").select("id, title").eq("user_id", viewer.id).is("completed_at", null)
      .or(`due_date.is.null,due_date.lte.${today}`).order("priority").limit(50),
    supabase.from("focus_sessions").select("kind").eq("user_id", viewer.id).eq("status", "completed")
      .gte("started_at", `${today}T00:00:00`),
  ]);
  return {
    active: active ?? null,
    serverNow: new Date().toISOString(),
    prefs: prefs ? { ...DEFAULT_PREFS, ...prefs } : DEFAULT_PREFS,
    goals: ((goals ?? []) as TimerGoal[]).map((g) => ({ ...g, progress: Number(g.progress), target: g.target == null ? null : Number(g.target) })),
    tasks: (tasks ?? []) as TimerTask[],
    pomodorosToday: (todays ?? []).filter((s) => s.kind === "pomodoro").length,
  };
}
