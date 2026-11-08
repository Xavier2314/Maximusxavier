import Link from "next/link";
import { ArrowRight, Building2 } from "lucide-react";
import { FocusPopup } from "@/components/focus-popup";
import { MonthTrack } from "./month-track";
import { GoalBoxes } from "./goal-boxes";
import { PushedChecklist, type HomeChecklist } from "./pushed-checklist";
import type { ChecklistItem, ItemProgress } from "@/lib/checklists";
import { CallerIllustration, WaverIllustration } from "@/components/brand/illustrations";
import { Avatar } from "@/components/ui/misc";
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
 * Home: only what matters today. What's next, checking in, the month, and this week's and today's
 * goals. Everything else lives one tap away in the menu.
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
    { data: focusData }, { data: followUps },
    { data: monthDays }, { data: team }, { data: periodGoals },
  ] = await Promise.all([
    supabase.rpc("attendance_streak"),
    supabase.from("attendance").select("*").eq("user_id", viewer.id).eq("attendance_date", today)
      .order("check_in_at", { ascending: false }).limit(1).maybeSingle<Attendance>(),
    supabase.from("monthly_goals").select("*").eq("user_id", viewer.id).eq("month", month).maybeSingle<MonthlyGoal>(),
    supabase.from("evaluations").select("id, submitted_at").eq("user_id", viewer.id).eq("period_date", period).maybeSingle(),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).is("read_at", null),
    supabase.rpc("growth_focus"),
    supabase.from("prospects").select("id, full_name, phone, next_follow_up_at, stage").eq("owner_id", viewer.id)
      .not("next_follow_up_at", "is", null).lte("next_follow_up_at", `${today}T23:59:59`).eq("opted_out", false)
      .not("stage", "in", "(joined,customer,not_now)").order("next_follow_up_at").limit(4),
    supabase.from("attendance").select("attendance_date").eq("user_id", viewer.id).gte("attendance_date", month).lte("attendance_date", today),
    viewer.can("view_direct_downlines") ? supabase.rpc("team_member_stats", { p_root: viewer.id, p_max_depth: 1 }) : Promise.resolve({ data: [] }),
    supabase.from("tool_goals").select("id, title, target, unit, status, horizon").eq("user_id", viewer.id).in("horizon", ["weekly", "daily"])
      .neq("status", "abandoned").lte("start_date", today).gte("deadline", today).order("created_at").limit(40),
  ]);
  // Checklists an admin pushed to this member; each stays on Home until every item is done.
  type Pushed = { checklist_id: string; pushed_checklists: { id: string; title: string; due_at: string | null;
    sender_name: string | null; sender_avatar: string | null } | null };
  const { data: pushedRows } = await supabase.from("pushed_checklist_recipients")
    .select("checklist_id, pushed_checklists(id, title, due_at, sender_name, sender_avatar)")
    .eq("user_id", viewer.id).returns<Pushed[]>();
  const pushedIds = (pushedRows ?? []).map((r) => r.checklist_id);
  const [{ data: pushedItems }, { data: pushedProgress }] = pushedIds.length
    ? await Promise.all([
        supabase.from("pushed_checklist_items").select("*").in("checklist_id", pushedIds).order("position").returns<ChecklistItem[]>(),
        supabase.from("pushed_checklist_progress").select("*").eq("user_id", viewer.id).returns<ItemProgress[]>(),
      ])
    : [{ data: [] as ChecklistItem[] }, { data: [] as ItemProgress[] }];
  const renderedAt = Date.now();
  const checklists: HomeChecklist[] = (pushedRows ?? []).flatMap((r) => {
    const c = r.pushed_checklists;
    if (!c) return [];
    const items = (pushedItems ?? []).filter((i) => i.checklist_id === c.id);
    const progress = (pushedProgress ?? []).filter((p) => items.some((i) => i.id === p.item_id));
    if (!items.length || items.every((i) => progress.some((p) => p.item_id === i.id && p.completed_at))) return [];
    const dueLabel = c.due_at
      ? (c.due_at.slice(0, 10) === today ? formatTime(c.due_at, tz) : `${formatDate(c.due_at, { weekday: "short" }, tz)} ${formatTime(c.due_at, tz)}`)
      : null;
    return [{ id: c.id, title: c.title, due_at: c.due_at, dueLabel, from: { name: c.sender_name ?? "Admin", avatar: c.sender_avatar }, items, progress }];
  });
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
  // The people you lead: active today means they did something in the app today.
  const dayIn = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  type Member = { member: string; full_name: string; avatar_url: string | null; depth: number; last_activity: string | null };
  const directs = ((team ?? []) as Member[]).filter((m) => m.depth === 1)
    .map((m) => ({ ...m, today: Boolean(m.last_activity) && dayIn(new Date(m.last_activity!)) === today }))
    .sort((a, b) => Number(b.today) - Number(a.today) || a.full_name.localeCompare(b.full_name));
  const activeToday = directs.filter((m) => m.today).length;
  const boxGoals = (h: string) => (periodGoals ?? []).filter((g) => g.horizon === h)
    .map((g) => ({ id: g.id as string, title: g.title as string, target: g.target == null ? null : Number(g.target), unit: g.unit as string | null, done: g.status === "completed" }));
  const checkInDays = [...new Set((monthDays ?? []).map((d) => Number(String(d.attendance_date).slice(8, 10))))];

  // Next up: the first unfinished daily goal, otherwise the next prospect to follow up.
  type FollowUp = { id: string; full_name: string; next_follow_up_at: string };
  const firstFollowUp = ((followUps ?? []) as FollowUp[])[0];
  const nextGoal = boxGoals("daily").find((g) => !g.done);
  const next = nextGoal
    ? { href: "/daily", title: nextGoal.title, sub: "Daily goal", tag: "Today" }
    : firstFollowUp
      ? { href: "/prospects", title: `Call ${firstFollowUp.full_name}`, sub: "Prospect follow-up", tag: firstFollowUp.next_follow_up_at.slice(0, 10) < today ? "Overdue" : "Today" }
      : null;
  const monthName = formatDate(today, { month: "long" }, tz);
  const firstName = viewer.profile.full_name.split(" ")[0] || viewer.profile.full_name;
  const streakDays = (streak as number | null) ?? 0;
  const unreadCount = unread ?? 0;
  const followUpCount = (followUps ?? []).length;
  const hour = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const sheet = "rounded-[22px] bg-surface dark:border dark:border-border";

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

      {checklists.map((c) => <PushedChecklist key={c.id} list={c} renderedAt={renderedAt} />)}

      <MonthTrack monthName={monthName} daysInMonth={daysInMonth} today={dayNum} checkIns={checkInDays} goalPct={goalPct} hasGoals={goalRows.length > 0} />

      <section aria-label="Today" className="grid gap-2.5 lg:grid-cols-2">
        <Link href={next?.href ?? "/daily"} className="relative flex min-h-[148px] flex-col overflow-hidden rounded-[26px] bg-black p-5 text-white transition-opacity hover:opacity-90 dark:ring-1 dark:ring-border">
          <CallerIllustration className="absolute -bottom-1 right-5 hidden h-24 w-auto sm:block" />
          <span className="flex items-center justify-between gap-3">
            <span className="text-sm text-white/70">Next up</span>
            {next && <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-black">{next.tag}</span>}
          </span>
          <span className="mt-auto pt-3 font-display text-[26px] leading-tight tracking-[-0.02em]">
            {next ? next.title : "Nothing planned yet"}
          </span>
          <span className="mt-1 text-sm text-white/70">
            {next ? next.sub : "Speak your goals for today"}
          </span>
        </Link>

        <Link href="/attendance" className="relative flex items-center justify-between gap-3 overflow-hidden rounded-[26px] bg-tile-green p-5 text-black transition-[filter] hover:brightness-95">
          <span className="min-w-0 flex-1">
            <span className="block font-display text-[26px] leading-tight tracking-[-0.02em]">{checkedIn ? "Checked in" : "Check in"}</span>
            <span className="mt-1 block text-sm">{checkedIn ? `Since ${formatTime(openAttendance.check_in_at, tz)}` : "Tap when you arrive at the office"}</span>
          </span>
          <WaverIllustration className="-my-5 h-28 w-auto shrink-0 self-end" />
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

      <GoalBoxes weekly={boxGoals("weekly")} daily={boxGoals("daily")} />

      {directs.length > 0 && (
        <Link href="/team" className="flex items-center gap-4 rounded-[22px] bg-surface px-5 py-4 transition-colors hover:bg-surface-muted">
          <span className="flex shrink-0 -space-x-2.5">
            {directs.slice(0, 5).map((m) => (
              <span key={m.member} className={m.today ? "rounded-full ring-2 ring-tile-green" : "rounded-full ring-2 ring-surface"} title={m.full_name}>
                <Avatar name={m.full_name} src={m.avatar_url} size={36} className="ring-0" />
              </span>
            ))}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block font-medium">Your team today</span>
            <span className="block truncate text-sm text-fg-muted tabular-nums">
              {activeToday} of {directs.length} active{directs.length > 5 ? `, ${directs.length - 5} more in your team` : ""}
            </span>
          </span>
          <ArrowRight className="size-5 shrink-0" aria-hidden />
        </Link>
      )}

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


    </div>
  );
}
