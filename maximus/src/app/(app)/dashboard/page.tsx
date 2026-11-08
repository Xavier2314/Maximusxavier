import Link from "next/link";
import { ArrowRight, Building2, Plus } from "lucide-react";
import { TaskQuickAdd } from "../planner/task-ui";
import { TASK_CATEGORIES, type Task } from "@/lib/planner";
import { FocusPopup } from "@/components/focus-popup";
import { TodayList, type TodayItem } from "./today-list";
import { MonthTrack } from "./month-track";
import { requireViewer } from "@/lib/auth";
import { FOCUS, topFocus, type GrowthFocus } from "@/lib/growth";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, GoalProgress, MonthlyGoal } from "@/lib/types";
import { currentEvaluationPeriod, formatDate, formatTime, monthStart, nextEvaluationDate, percent, todayIn } from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function isoWeek(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const week = Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/**
 * Home: only what matters today. What's next, checking in, this month's goals and follow-ups,
 * and one list for the day. Everything else lives one tap away in the menu.
 */
export default async function DashboardPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const tz = viewer.profile.timezone;
  const today = todayIn(tz);
  const month = monthStart(today);
  const period = currentEvaluationPeriod(today);

  const [
    { data: streak }, { data: openAttendance }, { data: goal }, { data: evaluation }, { count: unread },
    { data: focusData }, { data: checklistItems }, { data: checklistDone }, { data: followUps }, { data: todayTasks },
    { data: monthDays },
  ] = await Promise.all([
    supabase.rpc("attendance_streak"),
    supabase.from("attendance").select("*").eq("user_id", viewer.id).eq("attendance_date", today)
      .order("check_in_at", { ascending: false }).limit(1).maybeSingle<Attendance>(),
    supabase.from("monthly_goals").select("*").eq("user_id", viewer.id).eq("month", month).maybeSingle<MonthlyGoal>(),
    supabase.from("evaluations").select("id, submitted_at").eq("user_id", viewer.id).eq("period_date", period).maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null),
    supabase.rpc("growth_focus"),
    supabase.from("checklist_items").select("id, title").eq("is_active", true).order("sort_order"),
    supabase.from("checklist_checks").select("item_id").eq("user_id", viewer.id).eq("check_date", today),
    supabase.from("prospects").select("id, full_name, phone, next_follow_up_at, stage").eq("owner_id", viewer.id)
      .not("next_follow_up_at", "is", null).lte("next_follow_up_at", `${today}T23:59:59`).eq("opted_out", false)
      .not("stage", "in", "(joined,customer,not_now)").order("next_follow_up_at").limit(4),
    supabase.from("tasks").select("*").eq("user_id", viewer.id).is("completed_at", null).lte("due_date", today)
      .order("due_date").order("priority").limit(6).returns<Task[]>(),
    supabase.from("attendance").select("attendance_date").eq("user_id", viewer.id).gte("attendance_date", month).lte("attendance_date", today),
  ]);
  const focusTop = topFocus(focusData as GrowthFocus | null);
  const focusWeek = isoWeek(today);

  const progress = goal ? ((await supabase.rpc("goal_progress", { p_goal: goal.id })).data as GoalProgress | null) : null;
  const goalRows = goal && progress ? [
    { value: progress.income, target: goal.income_target },
    { value: progress.sales, target: goal.sales_target },
    { value: progress.prospecting, target: goal.prospecting_target },
    { value: progress.recruitment, target: goal.recruitment_target },
    { value: progress.orders, target: goal.order_target },
    { value: progress.savings, target: goal.savings_target },
  ].filter((g) => Number(g.target) > 0) : [];
  const goalPct = goalRows.length
    ? Math.round(goalRows.reduce((sum, g) => sum + percent(Number(g.value), Number(g.target)), 0) / goalRows.length)
    : 0;
  const checkedIn = openAttendance && !openAttendance.check_out_at;
  const [year, monthNum, dayNum] = today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const checkInDays = [...new Set((monthDays ?? []).map((d) => Number(String(d.attendance_date).slice(8, 10))))];

  type FollowUp = { id: string; full_name: string; phone: string | null; next_follow_up_at: string };
  const todayItems: TodayItem[] = [
    ...((followUps ?? []) as FollowUp[]).map((f) => ({
      kind: "followup" as const, id: f.id, name: f.full_name, phone: f.phone, overdue: f.next_follow_up_at.slice(0, 10) < today,
    })),
    ...(todayTasks ?? []).map((t) => {
      const overdue = Boolean(t.due_date && t.due_date < today);
      const category = TASK_CATEGORIES.find((c) => c.key === t.category)?.label;
      const detail = [
        overdue ? "Overdue" : null,
        category && category !== "Other" ? category : null,
        t.priority === 1 ? "high priority" : null,
      ].filter(Boolean).join(", ");
      return { kind: "task" as const, id: t.id, title: t.title, detail: detail.charAt(0).toUpperCase() + detail.slice(1) || "Task", overdue };
    }),
    ...((checklistItems ?? []) as { id: string; title: string }[]).map((c) => ({
      kind: "check" as const, id: c.id, title: c.title, done: (checklistDone ?? []).some((d) => d.item_id === c.id),
    })),
  ];
  const monthName = formatDate(today, { month: "long" }, tz);
  const firstName = viewer.profile.full_name.split(" ")[0] || viewer.profile.full_name;
  const streakDays = (streak as number | null) ?? 0;
  const unreadCount = unread ?? 0;
  const followUpCount = (followUps ?? []).length;
  const planItems = todayItems.filter((i) => i.kind !== "check").slice(0, 3);
  const next = planItems[0];
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const sheet = "rounded-[22px] bg-surface dark:border dark:border-border";
  const sheetLink = "text-sm font-medium text-primary hover:underline";

  return (
    <div className="space-y-6">
      {/* Greeting, then the day: what's next, check in, and the month at a glance. */}
      <div>
        <h1 className="text-[44px] leading-[0.95] tracking-[-0.03em] sm:text-6xl">{greeting},<br />{firstName}</h1>
        <p className="mt-3 text-fg-muted">
          {formatDate(today, { weekday: "long", day: "numeric", month: "long" }, tz)}.{" "}
          {streakDays ? `Day ${streakDays} in a row at the office` : "Check in to start your streak"}
        </p>
      </div>

      <MonthTrack monthName={monthName} daysInMonth={daysInMonth} today={dayNum} checkIns={checkInDays} goalPct={goalPct} hasGoals={goalRows.length > 0} />

      <section aria-label="Today" className="grid gap-2.5 lg:grid-cols-2">
        <Link href="/planner" className="flex min-h-[148px] flex-col rounded-[26px] bg-black p-5 text-white transition-opacity hover:opacity-90 dark:ring-1 dark:ring-border">
          <span className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/70">Next up</span>
            {next && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-black">{next.kind === "followup" || next.kind === "task" ? (next.overdue ? "Overdue" : "Today") : "Today"}</span>}
          </span>
          <span className="mt-auto pt-3 font-display text-[26px] leading-tight tracking-[-0.02em]">
            {next ? (next.kind === "followup" ? `Call ${next.name}` : next.title) : "Nothing planned yet"}
          </span>
          <span className="mt-1 text-sm text-white/70">
            {next ? (next.kind === "followup" ? "Prospect follow-up" : next.detail) : "Add the first thing you'll do today"}
          </span>
        </Link>

        <Link href="/attendance" className="flex items-center justify-between gap-4 rounded-[26px] bg-tile-green p-5 text-black transition-[filter] hover:brightness-95">
          <span className="min-w-0">
            <span className="block font-display text-[26px] leading-tight tracking-[-0.02em]">{checkedIn ? "Checked in" : "Check in"}</span>
            <span className="mt-1 block text-sm">{checkedIn ? `Since ${formatTime(openAttendance.check_in_at, tz)}` : "Tap when you arrive at the office"}</span>
          </span>
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-black text-white"><ArrowRight className="size-5" aria-hidden /></span>
        </Link>

        <div className="grid gap-2.5 lg:col-span-2 lg:grid-cols-3">
          <Link href="/prospects" className="flex items-center justify-between gap-3 rounded-[22px] bg-surface px-5 py-3.5 transition-colors hover:bg-surface-muted">
            <span><span className="block font-medium">Follow-ups</span><span className="text-sm text-fg-muted">{followUpCount ? `${followUpCount} due today` : "None due today"}</span></span>
            <ArrowRight className="size-5 shrink-0" aria-hidden />
          </Link>
          <Link href="/notifications" className="flex items-center justify-between gap-3 rounded-[22px] bg-surface px-5 py-3.5 transition-colors hover:bg-surface-muted">
            <span><span className="block font-medium">Notifications</span><span className="text-sm text-fg-muted">{unreadCount ? `${unreadCount} unread` : "All caught up"}</span></span>
            <ArrowRight className="size-5 shrink-0" aria-hidden />
          </Link>
          <Link href={evaluation ? "/evaluations" : "/evaluations/new"} className="flex items-center justify-between gap-3 rounded-[22px] bg-surface px-5 py-3.5 transition-colors hover:bg-surface-muted">
            <span><span className="block font-medium">{evaluation ? "Evaluation done" : "Complete your evaluation"}</span>
              <span className="text-sm text-fg-muted">{evaluation ? `Next on ${formatDate(nextEvaluationDate(today), { weekday: "short", day: "numeric", month: "short" }, tz)}` : "Takes about five minutes"}</span></span>
            <ArrowRight className="size-5 shrink-0" aria-hidden />
          </Link>
        </div>
      </section>

      <FocusPopup week={focusWeek} areas={focusTop.map((a) => ({
        key: a.key, title: FOCUS[a.key].title, why: FOCUS[a.key].why(a, "You"), tip: FOCUS[a.key].tips[0],
      }))} />

      {viewer.hasOfficeView && (
        <Link href={viewer.offices.length ? "/office" : viewer.isLeader ? "/office/team" : "/admin/approvals"}
          className={`${sheet} group flex items-center gap-4 p-4 transition-colors hover:border-primary/40`}>
          <span className="grid size-10 place-items-center text-fg-subtle"><Building2 className="size-5" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{viewer.offices.length ? "Office view" : viewer.isLeader ? "Team view" : "Approvals"}</span>
            <span className="block truncate text-sm text-fg-muted">
              {viewer.offices.length ? `Attendance, members and approvals for ${viewer.offices.length === 1 ? viewer.offices[0].name : `${viewer.offices.length} offices`}`
                : "See who is active and what is waiting for your review"}
            </span>
          </span>
          <ArrowRight className="size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}

      <div>
        {/* Today: one list of follow-ups, tasks and the daily checklist. */}
        <section aria-labelledby="today-heading" className={sheet}>
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
            <h2 id="today-heading" className="text-[22px] font-medium tracking-tight">Today</h2>
            <Link href="/planner" className={sheetLink}>Planner</Link>
          </div>
          <div className="px-3 pb-2 pt-1 [&>p]:px-2">
            {todayItems.length > 0 ? <TodayList items={todayItems} date={today} />
              : <p className="py-4 text-fg-muted">Nothing planned for today yet. Add the first thing you&apos;ll do.</p>}
          </div>
          <details className="group border-t border-border px-5 py-3" open={todayItems.length === 0}>
            <summary className="flex h-11 cursor-pointer list-none items-center gap-3 text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
              <Plus className="size-5" aria-hidden />Add a task
            </summary>
            <div className="pb-2 pt-1"><TaskQuickAdd today={today} compact /></div>
          </details>
        </section>

      </div>

    </div>
  );
}
