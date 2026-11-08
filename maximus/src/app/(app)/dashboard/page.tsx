import Link from "next/link";
import { ArrowRight, Building2, Plus } from "lucide-react";
import { TaskQuickAdd } from "../planner/task-ui";
import { TASK_CATEGORIES, type Motivation, type Task } from "@/lib/planner";
import { FocusPopup } from "@/components/focus-popup";
import { CallerIllustration, ClimberIllustration, WaverIllustration } from "@/components/brand/illustrations";
import { TodayList, type TodayItem } from "./today-list";
import { DuplicationSummary, FocusList, coursesForFocus } from "@/components/growth-focus";
import { LinkButton } from "@/components/ui/button";
import { Avatar, Badge, EmptyState, Progress } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { FOCUS, topFocus, type GrowthFocus } from "@/lib/growth";
import { createClient } from "@/lib/supabase/server";
import type { AccountBalance, Attendance, GoalProgress, MonthlyGoal, Notification } from "@/lib/types";
import {
  currentEvaluationPeriod, formatDate, formatMoney, formatRelative, formatTime, monthStart,
  nextEvaluationDate, percent, todayIn,
} from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function isoWeek(day: string) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const week = Math.ceil(((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}


export default async function DashboardPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const tz = viewer.profile.timezone;
  const today = todayIn(tz);
  const month = monthStart(today);
  const period = currentEvaluationPeriod(today);

  const [
    { data: streak }, { data: openAttendance }, { data: goal }, { data: evaluation }, { data: balances },
    { data: notifications }, { data: birthdays }, { data: lessonsDone }, { data: publishedLessons }, { data: focusData },
    { data: checklistItems }, { data: checklistDone }, { data: thought }, { data: pulse }, { data: followUps },
    { data: todayTasks }, { data: whys },
  ] = await Promise.all([
    supabase.rpc("attendance_streak"),
    supabase.from("attendance").select("*").eq("user_id", viewer.id).eq("attendance_date", today)
      .order("check_in_at", { ascending: false }).limit(1).maybeSingle<Attendance>(),
    supabase.from("monthly_goals").select("*").eq("user_id", viewer.id).eq("month", month).maybeSingle<MonthlyGoal>(),
    supabase.from("evaluations").select("id, submitted_at").eq("user_id", viewer.id).eq("period_date", period).maybeSingle(),
    supabase.from("financial_account_balances").select("*").eq("user_id", viewer.id).returns<AccountBalance[]>(),
    supabase.from("notifications").select("id, type, title, body, link, read_at, created_at").eq("user_id", viewer.id)
      .order("created_at", { ascending: false }).limit(4).returns<Notification[]>(),
    supabase.rpc("upcoming_birthdays", { p_days: 14 }),
    supabase.from("course_progress").select("lesson_id").eq("user_id", viewer.id),
    supabase.from("lessons").select("id", { count: "exact", head: false }),
    supabase.rpc("growth_focus"),
    supabase.from("checklist_items").select("id, title").eq("is_active", true).order("sort_order"),
    supabase.from("checklist_checks").select("item_id").eq("user_id", viewer.id).eq("check_date", today),
    supabase.from("daily_thoughts").select("body, author").lte("show_on", today).order("show_on", { ascending: false }).limit(1).maybeSingle(),
    viewer.profile.office_id ? supabase.rpc("office_pulse") : Promise.resolve({ data: null }),
    supabase.from("prospects").select("id, full_name, phone, next_follow_up_at, stage").eq("owner_id", viewer.id)
      .not("next_follow_up_at", "is", null).lte("next_follow_up_at", `${today}T23:59:59`).eq("opted_out", false)
      .not("stage", "in", "(joined,customer,not_now)").order("next_follow_up_at").limit(4),
    supabase.from("tasks").select("*").eq("user_id", viewer.id).is("completed_at", null).lte("due_date", today)
      .order("due_date").order("priority").limit(6).returns<Task[]>(),
    supabase.from("motivations").select("*").eq("user_id", viewer.id).eq("show_on_dashboard", true).returns<Motivation[]>(),
  ]);
  // A different reason each day.
  const dayIndex = Math.floor(new Date(`${today}T00:00:00Z`).getTime() / 86400000);
  const why = whys && whys.length ? whys[dayIndex % whys.length] : null;
  const whyImage = why?.image_path
    ? (await supabase.storage.from("motivations").createSignedUrl(why.image_path, 3600)).data?.signedUrl ?? null : null;
  const officePulse = pulse as { office: { name: string }; open_today: boolean; members: number; present_now: number; checked_in_today: number } | null;
  const growth = focusData as GrowthFocus | null;
  const focusTop = topFocus(growth);
  const focusCourses = await coursesForFocus(supabase, focusTop);
  const focusWeek = isoWeek(today);

  type Feedback = { id: string; action: string; comment: string; created_at: string; profiles: { full_name: string; avatar_url: string | null } | null };
  let progress: GoalProgress | null = null;
  let feedback: Feedback[] = [];
  if (goal) {
    const [p, f] = await Promise.all([
      supabase.rpc("goal_progress", { p_goal: goal.id }),
      supabase.from("goal_feedback").select("id, action, comment, created_at, profiles!goal_feedback_author_id_fkey(full_name, avatar_url)")
        .eq("goal_id", goal.id).neq("author_id", viewer.id).not("comment", "is", null).order("created_at", { ascending: false }).limit(2),
    ]);
    progress = p.data as GoalProgress | null;
    feedback = (f.data ?? []) as unknown as Feedback[];
  }
  const savings = balances?.find((b) => b.kind === "savings");
  const contributions = balances?.find((b) => b.kind === "contributions");
  const learningPct = percent(lessonsDone?.length ?? 0, publishedLessons?.length ?? 0);
  const goalRows = goal && progress ? [
    { label: "Income", value: progress.income, target: goal.income_target, money: true },
    { label: "Sales", value: progress.sales, target: goal.sales_target, money: true },
    { label: "Prospects", value: progress.prospecting, target: goal.prospecting_target, money: false },
    { label: "Recruits", value: progress.recruitment, target: goal.recruitment_target, money: false },
    { label: "Orders", value: progress.orders, target: goal.order_target, money: false },
    { label: "Savings", value: progress.savings, target: goal.savings_target, money: true },
  ].filter((g) => Number(g.target) > 0) : [];
  const goalPct = goalRows.length
    ? Math.round(goalRows.reduce((sum, g) => sum + percent(Number(g.value), Number(g.target)), 0) / goalRows.length)
    : 0;
  const checkedIn = openAttendance && !openAttendance.check_out_at;

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
  const [year, monthNum, dayNum] = today.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const pacePct = Math.round((dayNum / daysInMonth) * 100);
  const monthName = formatDate(today, { month: "long" }, tz);
  const firstName = viewer.profile.full_name.split(" ")[0] || viewer.profile.full_name;
  const streakDays = (streak as number | null) ?? 0;
  const unreadCount = (notifications ?? []).filter((n) => !n.read_at).length;
  const followUpCount = (followUps ?? []).length;
  const planItems = todayItems.filter((i) => i.kind !== "check").slice(0, 3);
  const sheet = "rounded-[22px] border border-border bg-surface";
  const sheetLink = "text-sm font-medium text-primary hover:underline";

  return (
    <div className="space-y-6">
      {/* Greeting, then the day as bold tiles: goals, today's plan, follow-ups, check-in. */}
      <div className="flex items-center gap-3">
        <Avatar name={viewer.profile.full_name} src={viewer.profile.avatar_url} size={44} className="ring-0" />
        <div className="min-w-0">
          <p className="text-sm text-fg-subtle">{formatDate(today, { weekday: "long", day: "numeric", month: "long" }, tz)}</p>
          <h1 className="truncate text-2xl font-semibold tracking-tight sm:text-3xl">Hi, {firstName}</h1>
        </div>
      </div>

      <section aria-label="Today" className="grid grid-flow-dense grid-cols-2 gap-3 lg:grid-cols-4">
        <Link href="/goals" className="relative col-span-2 flex items-end gap-2 overflow-hidden rounded-[22px] bg-tile-green p-5 text-black transition-[filter] hover:brightness-95">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold leading-tight">{monthName} goals</h2>
            <p className="mt-0.5 text-[15px]">{goalRows.length ? `${goalPct}% there, day ${dayNum} of ${daysInMonth}` : "Set your goals for this month"}</p>
            <p className="mt-0.5 text-sm font-semibold tabular-nums">Day {streakDays} in a row at the office</p>
            <Steps pct={goalRows.length ? goalPct : 0} />
          </div>
          <ClimberIllustration className="-mb-5 -mr-1 w-28 shrink-0 sm:w-36" />
        </Link>

        <Link href="/planner" className="row-span-2 flex min-h-[312px] flex-col rounded-[22px] bg-brand-blue p-5 text-white transition-[filter] hover:brightness-110">
          <h2 className="text-xl font-semibold leading-tight">Today&apos;s plan</h2>
          {planItems.length > 0 ? (
            <ul className="mt-4 space-y-3 text-[15px]">
              {planItems.map((item) => (
                <li key={item.id} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-tile-green" aria-hidden />
                  <span className="min-w-0">
                    <span className="line-clamp-2 font-semibold leading-snug">{item.kind === "followup" ? `Follow up ${item.name.split(" ")[0]}` : item.title}</span>
                    <span className="block truncate text-white/80">{item.kind === "followup" ? (item.overdue ? "Overdue" : "Prospect") : item.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : <p className="mt-3 text-white/80">Nothing planned yet. Add the first thing you&apos;ll do.</p>}
          <span className="mt-auto flex items-center justify-between pt-4 text-sm font-semibold">See all<ArrowRight className="size-4" aria-hidden /></span>
        </Link>

        <Link href="/prospects" className="relative flex min-h-[150px] flex-col overflow-hidden rounded-[22px] bg-tile-sky p-4 text-black transition-[filter] hover:brightness-95">
          <h2 className="text-lg font-semibold leading-tight">Follow-ups</h2>
          <p className="text-sm">{followUpCount ? "Due today" : "None due today"}</p>
          <span className="relative z-10 mt-auto text-3xl font-semibold leading-none tabular-nums">{followUpCount}</span>
          <CallerIllustration className="absolute -bottom-1 right-0 w-24" />
        </Link>

        <div className="col-span-2 flex flex-col gap-3">
          <Link href="/notifications" className="flex h-12 items-center justify-between rounded-full bg-fg px-5 font-semibold text-bg transition-opacity hover:opacity-90">
            <span>Notifications{unreadCount ? ` (${unreadCount})` : ""}</span><ArrowRight className="size-5" aria-hidden />
          </Link>
          {!evaluation ? (
            <Link href="/evaluations/new" className="flex h-12 items-center justify-between rounded-full border border-border px-5 font-medium transition-colors hover:bg-surface-muted">
              <span>Complete your evaluation</span><ArrowRight className="size-5" aria-hidden />
            </Link>
          ) : (
            <Link href="/evaluations" className="flex h-12 items-center justify-between rounded-full border border-border px-5 font-medium transition-colors hover:bg-surface-muted">
              <span>Next evaluation {formatDate(nextEvaluationDate(today), { weekday: "short", day: "numeric", month: "short" }, tz)}</span><ArrowRight className="size-5" aria-hidden />
            </Link>
          )}
        </div>

        <Link href="/attendance" className="relative flex min-h-[150px] flex-col overflow-hidden rounded-[22px] bg-tile-green p-4 text-black transition-[filter] hover:brightness-95">
          <h2 className="text-lg font-semibold leading-tight">{checkedIn ? "Checked in" : "Check in"}</h2>
          <p className="text-sm">{checkedIn ? `Since ${formatTime(openAttendance.check_in_at, tz)}` : "At the office today"}</p>
          <WaverIllustration className="absolute -bottom-1 right-1 w-24" />
        </Link>
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

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
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

        {/* This month as a scoreboard: each target with a marker for an even pace. */}
        <section aria-labelledby="month-heading" className={sheet}>
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
            <h2 id="month-heading" className="text-[22px] font-medium tracking-tight">{monthName}</h2>
            <span className="text-sm text-fg-subtle tabular-nums">Day {dayNum} of {daysInMonth}</span>
          </div>
          {goalRows.length > 0 ? (
            <div className="space-y-4 px-5 pb-5 pt-4">
              <ul className="space-y-4">
                {goalRows.map((g) => {
                  const pct = percent(g.value, g.target);
                  return (
                    <li key={g.label}>
                      <div className="flex justify-between gap-3">
                        <span className="text-fg-muted">{g.label}</span>
                        <span className="tabular-nums"><span className="font-medium">{g.money ? formatMoney(g.value) : g.value}</span>
                          <span className="text-fg-subtle"> of {g.money ? formatMoney(g.target) : g.target}</span></span>
                      </div>
                      <div className="relative mt-2 h-2 rounded-full bg-surface-muted" role="progressbar" aria-valuenow={Math.min(100, pct)}
                        aria-valuemin={0} aria-valuemax={100} aria-label={`${g.label}: ${pct}% of target`}>
                        <span className={`absolute inset-y-0 left-0 rounded-full ${pct >= 100 ? "bg-success" : "bg-primary"}`} style={{ width: `${Math.min(100, pct)}%` }} />
                        <span className="absolute -inset-y-1 w-0.5 rounded-full bg-fg/35" style={{ left: `${pacePct}%` }} aria-hidden />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-sm text-fg-subtle">The thin line marks where you&apos;d be on an even pace.</p>
              <div className="flex flex-wrap items-center gap-3">
                {goal && <GoalStatusBadge status={goal.status} />}
                <Link href="/goals" className={sheetLink}>Open goals</Link>
              </div>
            </div>
          ) : (
            <EmptyState art="tasks" title="No goals for this month yet"
              description="Members who write their goals down achieve more. It takes two minutes."
              action={<LinkButton href="/goals/new">Set my goals</LinkButton>} />
          )}
        </section>
      </div>

      {/* Quiet row: the reasons and the people behind the numbers. */}
      <section aria-label="For you today" className="grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2">
        <div className="bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="font-medium text-fg-muted">My why</h3>
            <Link href="/why" className={sheetLink}>{why ? "All" : "Write it"}</Link>
          </div>
          {why ? (
            <>
              {whyImage && <img src={whyImage} alt="" className="mt-3 h-32 w-full rounded-xl object-cover" />}
              <p className="mt-2 text-xl leading-snug tracking-tight">{why.title}</p>
              {why.body && <p className="mt-1 line-clamp-3 text-fg-muted">{why.body}</p>}
            </>
          ) : <p className="mt-2 text-fg-muted">Who are you doing this for? Write it down and see it here every day.</p>}
        </div>
        <div className="bg-surface p-5">
          <h3 className="font-medium text-fg-muted">Thought of the day</h3>
          {thought ? (
            <blockquote className="mt-2">
              <p className="text-xl leading-snug tracking-tight">“{thought.body as string}”</p>
              {thought.author && <footer className="mt-2 text-fg-muted">{thought.author as string}</footer>}
            </blockquote>
          ) : <p className="mt-2 text-fg-muted">A new one appears each morning.</p>}
        </div>
        <div className="bg-surface p-5">
          <h3 className="font-medium text-fg-muted">From your sponsor</h3>
          {feedback.length > 0 ? (
            <ul className="mt-3 space-y-3">
              {feedback.map((f) => (
                <li key={f.id}>
                  <Link href={`/goals/${goal!.id}`} className="flex gap-3 hover:opacity-80">
                    <Avatar name={f.profiles?.full_name ?? "Sponsor"} src={f.profiles?.avatar_url} size={32} />
                    <span className="min-w-0">
                      <span className="block font-medium">{f.profiles?.full_name}<span className="font-normal text-fg-subtle">, {formatRelative(f.created_at)}</span></span>
                      <span className="line-clamp-2 text-fg-muted">{f.comment}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-fg-muted">
              {goal && goal.status !== "draft" ? "No feedback yet. Your sponsor will reply here." : "Submit your goals and your sponsor's advice will show up here."}
            </p>
          )}
        </div>
        <div className="bg-surface p-5">
          <h3 className="font-medium text-fg-muted">{officePulse ? officePulse.office.name : "Your office"}</h3>
          {officePulse ? (
            <div className="mt-2 flex items-end gap-6">
              <p><span className="block text-4xl font-medium leading-none tabular-nums">{officePulse.present_now}</span>
                <span className="mt-1 block text-fg-muted">in the office now</span></p>
              <p className="text-fg-muted">
                <span className="tabular-nums text-fg">{officePulse.checked_in_today}</span> checked in today<br />
                <span className="tabular-nums text-fg">{officePulse.members}</span> members{officePulse.open_today ? "" : ", closed today"}
              </p>
            </div>
          ) : (
            <p className="mt-2 text-fg-muted">Choose your office in your <Link href="/profile" className={sheetLink}>profile</Link>.</p>
          )}
        </div>
      </section>

      {/* Your numbers this month, as plain figures. */}
      <section aria-label="Your numbers this month" className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-border bg-border lg:grid-cols-4">
        {[
          { label: "Earnings entered", value: formatMoney(progress?.income ?? 0), hint: "From your evaluations this month" },
          { label: "Savings, confirmed", value: formatMoney(savings?.confirmed_balance ?? 0),
            hint: savings && savings.pending_in > 0 ? `${formatMoney(savings.pending_in)} awaiting approval` : "Approved entries only" },
          { label: "Evaluation", value: evaluation ? "Done" : "Due", hint: `Period of ${formatDate(period, { day: "numeric", month: "short" })}` },
          { label: "Learning", value: `${learningPct}%`, hint: `${lessonsDone?.length ?? 0} lessons completed` },
        ].map((s) => (
          <div key={s.label} className="bg-surface p-4 sm:p-5">
            <p className="text-sm text-fg-muted">{s.label}</p>
            <p className="mt-1 text-2xl font-medium tracking-tight tabular-nums">{s.value}</p>
            <p className="mt-0.5 text-sm text-fg-subtle">{s.hint}</p>
          </div>
        ))}
      </section>

      {growth && focusTop.length > 0 && (
        <section aria-labelledby="focus-heading" className={sheet}>
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
            <div>
              <h2 id="focus-heading" className="text-[22px] font-medium tracking-tight">Your focus this week</h2>
              <p className="text-fg-muted">The three areas that will grow you and your team the most right now</p>
            </div>
            <Link href="/growth" className={sheetLink}>Open</Link>
          </div>
          <div className="space-y-5 p-5">
            <DuplicationSummary focus={growth} />
            <FocusList areas={focusTop} courses={focusCourses} compact />
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="updates-heading" className={sheet}>
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
            <h2 id="updates-heading" className="text-lg font-medium">Latest updates</h2>
            <Link href="/notifications" className={sheetLink}>All</Link>
          </div>
          <div className="px-5 pb-3">
            {notifications && notifications.length > 0 ? (
              <ul className="divide-y divide-border">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link href={n.link ?? "/notifications"} className="flex gap-3 py-3 hover:opacity-80">
                      <span className={`mt-2 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-primary"}`} aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{n.title}</span>
                        {n.body && <span className="line-clamp-2 text-sm text-fg-muted">{n.body}</span>}
                        <span className="text-sm text-fg-subtle">{formatRelative(n.created_at)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="py-4 text-fg-muted">You&apos;re all caught up.</p>}
          </div>
        </section>

        <section aria-labelledby="savings-heading" className={sheet}>
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
            <h2 id="savings-heading" className="text-lg font-medium">Savings and contributions</h2>
            <Link href="/finance" className={sheetLink}>Ledger</Link>
          </div>
          <div className="space-y-4 p-5">
            {[savings, contributions].filter(Boolean).map((b) => (
              <div key={b!.account_id}>
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-fg-muted">{b!.name}</span>
                  <span className="text-lg font-medium tabular-nums">{formatMoney(b!.confirmed_balance)}</span>
                </div>
                {b!.target_amount ? (
                  <>
                    <Progress value={percent(b!.confirmed_balance, b!.target_amount)} tone="green" className="mt-2 h-2" label={`${b!.name} target`} />
                    <p className="mt-1 text-sm text-fg-subtle">Target {formatMoney(b!.target_amount)}</p>
                  </>
                ) : null}
              </div>
            ))}
            <p className="text-sm text-fg-subtle">Approved entries only. These are organisation records, not bank balances.</p>
          </div>
        </section>

        <section aria-labelledby="birthdays-heading" className={sheet}>
          <div className="flex items-baseline justify-between gap-3 px-5 pt-5">
            <h2 id="birthdays-heading" className="text-lg font-medium">Birthdays</h2>
            <Link href="/recognition" className={sheetLink}>More</Link>
          </div>
          <div className="px-5 pb-5 pt-3">
            {(birthdays as Birthday[] | null)?.length ? (
              <ul className="space-y-3">
                {(birthdays as Birthday[]).slice(0, 4).map((b) => (
                  <li key={b.member} className="flex items-center gap-3">
                    <Avatar name={b.full_name} src={b.avatar_url} size={36} />
                    <span className="min-w-0 flex-1 truncate">{b.full_name}</span>
                    <span className={b.days_until === 0 ? "font-medium text-success" : "text-fg-subtle"}>
                      {b.days_until === 0 ? "Today" : b.days_until === 1 ? "Tomorrow"
                        : new Date(Date.UTC(2000, b.birthday_month - 1, b.birthday_day)).toLocaleDateString("en-NG", { day: "numeric", month: "short", timeZone: "UTC" })}
                    </span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-fg-muted">No birthdays in the next two weeks.</p>}
          </div>
        </section>
      </div>

      <section aria-labelledby="ai-heading" className={`${sheet} p-5`}>
        <div className="flex flex-wrap items-baseline justify-between gap-3">
          <h2 id="ai-heading" className="text-lg font-medium">Ask Maximus AI</h2>
          <Link href="/ai" className={sheetLink}>Open chat</Link>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {["Plan my week to hit my prospecting target", "Help me follow up with a prospect", "How do I support a struggling downline?"].map((q) => (
            <Link key={q} href={`/ai?q=${encodeURIComponent(q)}`}
              className="inline-flex min-h-11 items-center rounded-xl border border-border px-4 py-2 text-left transition-colors hover:border-primary hover:bg-primary-soft">
              {q}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

/** A dotted step track for the month's goals, with a white marker where you are now. */
function Steps({ pct }: { pct: number }) {
  const steps = 6;
  const at = Math.min(steps - 1, Math.round((Math.min(100, pct) / 100) * (steps - 1)));
  const pos = (k: number) => 6 + (k * 88) / (steps - 1);
  return (
    <div className="relative mt-4 h-8 rounded-full bg-black" role="progressbar" aria-valuenow={Math.min(100, pct)} aria-valuemin={0} aria-valuemax={100} aria-label="Goals this month">
      <span className="absolute inset-y-1 left-1 rounded-full bg-brand-blue" style={{ width: `calc(${pos(at)}% + 8px)` }} aria-hidden />
      {Array.from({ length: steps }, (_, k) => (
        <span key={k} aria-hidden className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white ${k === at ? "size-6" : k < at ? "size-1.5 opacity-70" : "size-1.5 opacity-40"}`}
          style={{ left: `${pos(k)}%` }} />
      ))}
    </div>
  );
}

type Birthday = { member: string; full_name: string; avatar_url: string | null; birthday_month: number; birthday_day: number; days_until: number };

function GoalStatusBadge({ status }: { status: MonthlyGoal["status"] }) {
  const map = {
    draft: <Badge>Draft</Badge>,
    submitted: <Badge tone="blue">Awaiting sponsor review</Badge>,
    approved: <Badge tone="green">Approved</Badge>,
    revision_requested: <Badge tone="amber">Revision requested</Badge>,
  } as const;
  return map[status];
}
