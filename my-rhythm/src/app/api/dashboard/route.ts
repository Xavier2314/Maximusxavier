import { DateTime } from "luxon";
import { route } from "@/lib/api";
import { decorate, loadScheduleData, occurrencesForDays } from "@/lib/data";
import { categoryStats, dailyProgress, streaks } from "@/lib/stats";
import { motivation } from "@/lib/motivation";

export const dynamic = "force-dynamic";

export const GET = route(async (_req, { supabase, user }) => {
  const prelim = await supabase.from("profiles").select("timezone").eq("id", user.id).maybeSingle();
  const tz = prelim.data?.timezone ?? "Africa/Lagos";
  const now = DateTime.now().setZone(tz);
  const today = now.toISODate()!;
  const weekStart = now.startOf("week").toISODate()!;
  const weekEnd = now.endOf("week").toISODate()!;
  const data = await loadScheduleData(supabase, user.id, { completionsFrom: now.minus({ days: 60 }).toISODate()! });

  const todayOcc = decorate(occurrencesForDays(data, today, today, true), data, now)
    .filter((o) => DateTime.fromISO(o.start).setZone(tz).toISODate() === today || o.allDay || DateTime.fromISO(o.end) > now.startOf("day"));
  const live = todayOcc.filter((o) => o.state !== "cancelled");
  const current = live.find((o) => !o.allDay && DateTime.fromISO(o.start) <= now && DateTime.fromISO(o.end) > now && o.state !== "completed" && o.state !== "skipped") ?? null;
  const next = live.find((o) => !o.allDay && DateTime.fromISO(o.start) > now) ?? null;
  const nextLater = next ?? decorate(occurrencesForDays(data, now.plus({ days: 1 }).toISODate()!, now.plus({ days: 2 }).toISODate()!), data, now).find((o) => !o.allDay) ?? null;

  const week = decorate(occurrencesForDays(data, weekStart, weekEnd, true), data, now);
  const weekStats = categoryStats(week.map((o) => ({ ...o, categoryKey: o.category?.key ?? null, completionMinutes: o.completion?.duration_minutes })));
  const weekDue = week.filter((o) => ["completed", "skipped", "missed"].includes(o.state) && !(o.groupKey === "gym-morning" && !/workout/i.test(o.title)));
  const weekDone = weekDue.filter((o) => o.state === "completed").length;

  const upcoming = decorate(occurrencesForDays(data, now.plus({ days: 1 }).toISODate()!, now.plus({ days: 7 }).toISODate()!), data, now)
    .filter((o) => !o.recurring || o.status === "needs_reschedule" || o.modified)
    .slice(0, 8);
  const flagged = decorate(occurrencesForDays(data, today, now.plus({ days: 21 }).toISODate()!), data, now).filter((o) => o.status === "needs_reschedule");

  const [{ data: habits }, { data: hc }, { data: reminders }, { data: subs }] = await Promise.all([
    supabase.from("habits").select("id,name,icon,color,target_per_week").eq("user_id", user.id).eq("active", true).order("position"),
    supabase.from("habit_completions").select("habit_id,completed_on").eq("user_id", user.id).gte("completed_on", now.minus({ days: 400 }).toISODate()!),
    supabase.from("scheduled_reminders").select("id,title,body,fire_at,kind,status").eq("user_id", user.id).eq("status", "pending").gte("fire_at", now.toUTC().toISO()!).order("fire_at").limit(5),
    supabase.from("push_subscriptions").select("id").eq("user_id", user.id).eq("active", true),
  ]);
  const habitStreaks = (habits ?? []).map((h) => {
    const dates = (hc ?? []).filter((c) => c.habit_id === h.id).map((c) => c.completed_on as string);
    return { ...h, doneToday: dates.includes(today), ...streaks(dates, today) };
  });

  return {
    now: now.toISO(),
    timezone: tz,
    profile: data.profile,
    motivation: motivation(today),
    today: todayOcc,
    current,
    next: nextLater,
    progress: dailyProgress(todayOcc.map((o) => ({ ...o, categoryKey: o.category?.key ?? null }))),
    week: { done: weekDone, due: weekDue.length, percent: weekDue.length ? Math.round((weekDone / weekDue.length) * 100) : null, stats: weekStats },
    upcoming,
    flagged,
    habits: habitStreaks,
    reminders: reminders ?? [],
    devices: subs?.length ?? 0,
    categories: data.categories,
  };
});
