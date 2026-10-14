import { DateTime } from "luxon";
import { route } from "@/lib/api";
import { decorate, loadScheduleData, occurrencesForDays } from "@/lib/data";
import { categoryStats, gentleSummary, streaks } from "@/lib/stats";

/** Weekly review: everything computed from real completion records. */
export const GET = route(async (req, { supabase, user }) => {
  const url = new URL(req.url);
  const pre = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const tz = pre.data?.timezone ?? "Africa/Lagos";
  const now = DateTime.now().setZone(tz);
  const anchor = url.searchParams.get("week") ? DateTime.fromISO(url.searchParams.get("week")!, { zone: tz }) : now;
  const from = anchor.startOf("week").toISODate()!;
  const to = anchor.endOf("week").toISODate()!;
  const data = await loadScheduleData(supabase, user.id, { completionsFrom: from, completionsTo: to });
  const occ = decorate(occurrencesForDays(data, from, to, true), data, now);
  const stats = categoryStats(occ.map((o) => ({ ...o, categoryKey: o.category?.key ?? null, completionMinutes: o.completion?.duration_minutes })));
  const names = Object.fromEntries(data.categories.map((c) => [c.key, c.name]));

  const [habits, hc, practice, workouts, lessons, episodes, proposals] = await Promise.all([
    supabase.from("habits").select("id,name,color,target_per_week").eq("user_id", user.id).eq("active", true).order("position"),
    supabase.from("habit_completions").select("habit_id,completed_on").eq("user_id", user.id).gte("completed_on", anchor.minus({ days: 400 }).toISODate()!),
    supabase.from("keyboard_practice_sessions").select("duration_minutes,practice_date").eq("user_id", user.id).gte("practice_date", from).lte("practice_date", to),
    supabase.from("gym_workouts").select("id,workout_date,duration_minutes").eq("user_id", user.id).gte("workout_date", from).lte("workout_date", to),
    supabase.from("keyboard_lessons").select("attended,lesson_date").eq("user_id", user.id).gte("lesson_date", from).lte("lesson_date", to),
    supabase.from("podcast_episodes").select("title,stage,updated_at").eq("user_id", user.id).gte("updated_at", `${from}T00:00:00`),
    supabase.from("schedule_proposals").select("id,title,status,created_at").eq("user_id", user.id).gte("created_at", `${from}T00:00:00`).lte("created_at", `${to}T23:59:59`),
  ]);
  const habitRows = (habits.data ?? []).map((h) => {
    const dates = (hc.data ?? []).filter((c) => c.habit_id === h.id).map((c) => c.completed_on as string);
    const weekDates = dates.filter((d) => d >= from && d <= to);
    return { ...h, weekCount: weekDates.length, days: weekDates, ...streaks(dates, to < now.toISODate()! ? to : now.toISODate()!) };
  });
  const sleep = habitRows.find((h) => /sleep/i.test(h.name));
  const missed = occ.filter((o) => o.state === "missed" && !(o.groupKey === "gym-morning" && !/workout/i.test(o.title)));
  const practiceMinutes = (practice.data ?? []).reduce((s, p) => s + (p.duration_minutes ?? 0), 0) + (stats.keyboard?.minutesCompleted ?? 0);

  const recommendations: string[] = [];
  if ((stats.spiritual?.rate ?? 100) < 70) recommendations.push("Protect your 5:00 AM devotion: prepare the night before and keep your phone's bedtime reminder on.");
  if ((stats.gym?.rate ?? 100) < 60) recommendations.push("If mornings feel heavy, try laying out your gym bag the night before — or plan one lighter session.");
  if (practiceMinutes < 180) recommendations.push("Aim for at least 3 hours of keyboard practice next week — ask the assistant where you can fit an extra session.");
  if (missed.length > 5) recommendations.push("Several sessions slipped this week. Consider making one flexible activity optional next week to create breathing room.");
  if (sleep && sleep.weekCount < 4) recommendations.push("Sleep consistency was low. Honouring the 8:30 PM wind-down reminder will make 5:00 AM easier.");
  if (!recommendations.length) recommendations.push("Keep going — your rhythm is working. Choose one small improvement for next week.");

  return {
    week: { from, to },
    stats,
    names,
    summary: gentleSummary(stats, names),
    habits: habitRows,
    missed: missed.map((o) => ({ title: o.title, start: o.start, key: o.key })),
    keyboard: {
      practiceMinutes,
      lessonsAttended: (stats.keyboard ? occ.filter((o) => /lesson/i.test(o.title) && o.state === "completed").length : 0) + (lessons.data ?? []).filter((l) => l.attended).length,
      lessonsScheduled: occ.filter((o) => /lesson/i.test(o.title) && o.state !== "cancelled").length,
    },
    gym: { sessions: stats.gym?.completed ?? 0, logged: workouts.data?.length ?? 0 },
    podcast: { episodesTouched: episodes.data ?? [] },
    sleep: sleep ? { nights: sleep.weekCount } : null,
    changes: proposals.data ?? [],
    recommendations,
  };
});
