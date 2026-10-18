import Link from "next/link";
import {
  ArrowRight, Bell, Building2, Cake, Compass, ListChecks, MessageCircle, MessageSquare, Phone, Quote, ClipboardCheck,
  GraduationCap, ListTodo, PiggyBank, Sparkles, Target, TrendingUp,
} from "lucide-react";
import { TaskQuickAdd, TaskRow } from "../planner/task-ui";
import type { Motivation, Task } from "@/lib/planner";
import { FocusPopup } from "@/components/focus-popup";
import { DailyChecklist } from "./checklist";
import { DuplicationSummary, FocusList, coursesForFocus } from "@/components/growth-focus";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, Progress, StatCard } from "@/components/ui/misc";
import { ROLE_LABELS, primaryRole, requireViewer } from "@/lib/auth";
import { motivationFor } from "@/lib/motivation";
import { rankLabel } from "@/lib/ranks";
import { WelcomeHero } from "./welcome-hero";
import { WhyStrip } from "./why-strip";
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

function hourIn(tz: string) {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date())) % 24;
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
  // Today's reason first, then the rest.
  const allWhys = whys ?? [];
  const start = allWhys.length ? dayIndex % allWhys.length : 0;
  const orderedWhys = [...allWhys.slice(start), ...allWhys.slice(0, start)];
  const whyPaths = orderedWhys.map((w) => w.image_path).filter((x): x is string => Boolean(x));
  const whyImages: Record<string, string> = {};
  if (whyPaths.length) {
    const { data: signed } = await supabase.storage.from("motivations").createSignedUrls(whyPaths, 3600);
    for (const w of orderedWhys) {
      const url = signed?.find((x) => x.path === w.image_path)?.signedUrl;
      if (url) whyImages[w.id] = url;
    }
  }
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
  const firstName = viewer.profile.full_name.split(" ")[0];
  const checkedIn = openAttendance && !openAttendance.check_out_at;
  const role = primaryRole(viewer.roles);

  return (
    <div className="space-y-6">
      <WelcomeHero
        firstName={firstName} avatar={viewer.profile.avatar_url} hour={hourIn(tz)} memberId={viewer.profile.member_id}
        dateLabel={formatDate(today, { weekday: "long", day: "numeric", month: "long" }, tz)}
        rank={rankLabel(viewer.profile.business_rank)} role={role === "member" ? null : ROLE_LABELS[role]}
        streak={(streak as number | null) ?? 0} checkedInAt={checkedIn ? formatTime(openAttendance.check_in_at, tz) : null}
        evaluationDue={!evaluation} nextEvaluation={formatDate(nextEvaluationDate(today), { day: "numeric", month: "short" })}
        goalPct={goalPct} hasGoals={goalRows.length > 0} word={motivationFor(today)} />

      <WhyStrip whys={orderedWhys} images={whyImages} today={today} />

      <FocusPopup week={focusWeek} areas={focusTop.map((a) => ({
        key: a.key, title: FOCUS[a.key].title, why: FOCUS[a.key].why(a, "You"), tip: FOCUS[a.key].tips[0],
      }))} />

      {/* Personal stats */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Your numbers this month">
        <StatCard label="Earnings entered" value={formatMoney(progress?.income ?? 0)} hint="From your evaluations this month" icon={<TrendingUp className="size-4" />} />
        <StatCard label="Savings (confirmed)" value={formatMoney(savings?.confirmed_balance ?? 0)}
          hint={savings && savings.pending_in > 0 ? `${formatMoney(savings.pending_in)} awaiting approval` : "Approved ledger entries only"}
          icon={<PiggyBank className="size-4" />} tone="green" />
        <StatCard label="Evaluation" value={evaluation ? "Done" : "Due"} hint={`Period of ${formatDate(period, { day: "numeric", month: "short" })}`}
          icon={<ClipboardCheck className="size-4" />} tone={evaluation ? "green" : "lime"} />
        <StatCard label="Learning" value={`${learningPct}%`} hint={`${lessonsDone?.length ?? 0} lessons completed`} icon={<GraduationCap className="size-4" />} tone="navy" />
      </section>

      {viewer.hasOfficeView && (
        <Link href={viewer.offices.length ? "/office" : viewer.isLeader ? "/office/team" : "/admin/approvals"}
          className="card group flex items-center gap-4 p-4 hover:border-primary/40">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-navy text-brand-lime"><Building2 className="size-5" aria-hidden /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold">{viewer.offices.length ? "Office view" : viewer.isLeader ? "Team view" : "Approvals"}</span>
            <span className="block truncate text-sm text-fg-muted">
              {viewer.offices.length ? `Attendance, members and approvals for ${viewer.offices.length === 1 ? viewer.offices[0].name : `${viewer.offices.length} offices`}`
                : "See who is active and what is waiting for your review"}
            </span>
          </span>
          <ArrowRight className="size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Follow-ups due" icon={<Phone className="size-4" />} description="Prospects waiting to hear from you"
            action={<Link href="/prospects" className="text-sm font-medium text-primary hover:underline">All</Link>} />
          <CardBody className="pt-3">
            {(followUps ?? []).length > 0 ? (
              <ul className="space-y-1">
                {(followUps as { id: string; full_name: string; phone: string | null; next_follow_up_at: string }[]).map((p) => (
                  <li key={p.id} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-muted">
                    <Avatar name={p.full_name} size={32} />
                    <Link href={`/prospects/${p.id}`} className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{p.full_name}</span>
                      <span className="text-xs text-fg-subtle">{p.next_follow_up_at < today ? "Overdue" : "Today"}</span>
                    </Link>
                    {p.phone && (
                      <a href={`https://wa.me/${p.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                        className="grid size-8 place-items-center rounded-lg text-success hover:bg-success-soft" aria-label={`WhatsApp ${p.full_name}`}>
                        <MessageCircle className="size-4" aria-hidden />
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="py-4 text-center">
                <p className="text-sm text-fg-muted">No follow-ups due today.</p>
                <Link href="/prospects" className="mt-1 inline-block text-sm font-medium text-primary hover:underline">Add someone new to talk to</Link>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={officePulse ? officePulse.office.name : "Your office"} icon={<Building2 className="size-4" />}
            description={officePulse ? (officePulse.open_today ? "Open today" : "Closed today") : "Choose your office in your profile"} />
          <CardBody>
            {officePulse ? (
              <div className="flex items-center gap-5">
                <div>
                  <p className="text-4xl font-bold tabular-nums">{officePulse.present_now}</p>
                  <p className="text-sm text-fg-muted">in the office now</p>
                </div>
                <div className="flex-1 space-y-2 text-sm">
                  <p className="flex justify-between"><span className="text-fg-muted">Checked in today</span><b className="tabular-nums">{officePulse.checked_in_today}</b></p>
                  <p className="flex justify-between"><span className="text-fg-muted">Members</span><b className="tabular-nums">{officePulse.members}</b></p>
                </div>
              </div>
            ) : <LinkButton href="/profile" variant="outline" size="sm">Open profile</LinkButton>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="From your sponsor" icon={<MessageSquare className="size-4" />} description="Feedback on this month's goals" />
          <CardBody className="pt-3">
            {feedback.length > 0 ? (
              <ul className="space-y-3">
                {feedback.map((f) => (
                  <li key={f.id}>
                    <Link href={`/goals/${goal!.id}`} className="flex gap-3 hover:opacity-80">
                      <Avatar name={f.profiles?.full_name ?? "Sponsor"} src={f.profiles?.avatar_url} size={32} />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{f.profiles?.full_name} <span className="font-normal text-fg-subtle">· {formatRelative(f.created_at)}</span></span>
                        <span className="line-clamp-2 text-sm text-fg-muted">{f.comment}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-4 text-center text-sm text-fg-muted">
                {goal && goal.status !== "draft" ? "No feedback yet. Your sponsor will reply here." : "Submit your goals and your sponsor's advice will show up here."}
              </p>
            )}
          </CardBody>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader title="Today's tasks" icon={<ListTodo className="size-4" />}
            description={(todayTasks ?? []).length ? "Tap the circle when it's done" : "Plan your day in a minute"}
            action={<Link href="/planner" className="text-sm font-medium text-primary hover:underline">Planner</Link>} />
          <CardBody className="pt-2">
            {(todayTasks ?? []).length > 0 ? (
              <ul className="divide-y divide-border/60">
                {(todayTasks ?? []).map((t) => <TaskRow key={t.id} task={t} today={today} />)}
              </ul>
            ) : (
              <TaskQuickAdd today={today} compact />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Today's checklist" icon={<ListChecks className="size-4" />} description="Small daily actions build big results" />
          <CardBody>
            {(checklistItems ?? []).length > 0
              ? <DailyChecklist date={today} items={(checklistItems ?? []) as { id: string; title: string }[]} done={(checklistDone ?? []).map((c) => c.item_id as string)} />
              : <p className="text-sm text-fg-muted">No checklist items yet.</p>}
          </CardBody>
        </Card>
        <Card className="relative overflow-hidden">
          <CardHeader title="Thought of the day" icon={<Quote className="size-4" />} />
          <CardBody>
            {thought ? (
              <blockquote>
                <p className="text-lg font-semibold leading-snug tracking-tight">“{thought.body as string}”</p>
                {thought.author && <footer className="mt-3 text-sm text-fg-muted">— {thought.author as string}</footer>}
              </blockquote>
            ) : <p className="text-sm text-fg-muted">Check back tomorrow.</p>}
          </CardBody>
        </Card>
      </div>

      {growth && focusTop.length > 0 && (
        <Card>
          <CardHeader title="Your focus this week" icon={<Compass className="size-4" />}
            description="The three areas that will grow you and your team the most right now"
            action={<Link href="/growth" className="text-sm font-medium text-primary hover:underline">Open</Link>} />
          <CardBody className="space-y-5">
            <DuplicationSummary focus={growth} />
            <FocusList areas={focusTop} courses={focusCourses} compact />
          </CardBody>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Goals */}
        <Card className="lg:col-span-2">
          <CardHeader title="This month's goals" icon={<Target className="size-4" />}
            description={goal ? <GoalStatusBadge status={goal.status} /> : "Set your targets to start tracking progress"}
            action={<Link href="/goals" className="text-sm font-medium text-primary hover:underline">Open</Link>} />
          <CardBody>
            {goalRows.length > 0 ? (
              <ul className="grid gap-4 sm:grid-cols-2">
                {goalRows.map((g) => (
                  <li key={g.label}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="text-fg-muted">{g.label}</span>
                      <span className="tabular-nums"><b>{g.money ? formatMoney(g.value) : g.value}</b>
                        <span className="text-fg-subtle"> / {g.money ? formatMoney(g.target) : g.target}</span></span>
                    </div>
                    <Progress value={percent(g.value, g.target)} tone={percent(g.value, g.target) >= 100 ? "green" : "blue"} label={`${g.label} progress`} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<Target className="size-6" />} title="No goals for this month yet"
                description="Members who write their goals down achieve more. It takes two minutes."
                action={<LinkButton href="/goals/new">Set my goals</LinkButton>} />
            )}
          </CardBody>
        </Card>

        {/* Notifications */}
        <Card>
          <CardHeader title="Latest updates" icon={<Bell className="size-4" />}
            action={<Link href="/notifications" className="text-sm font-medium text-primary hover:underline">All</Link>} />
          <CardBody className="pt-3">
            {notifications && notifications.length > 0 ? (
              <ul className="divide-y divide-border">
                {notifications.map((n) => (
                  <li key={n.id}>
                    <Link href={n.link ?? "/notifications"} className="flex gap-3 py-3 hover:opacity-80">
                      <span className={`mt-1.5 size-2 shrink-0 rounded-full ${n.read_at ? "bg-transparent" : "bg-brand-green"}`} aria-hidden />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">{n.title}</span>
                        {n.body && <span className="line-clamp-2 text-sm text-fg-muted">{n.body}</span>}
                        <span className="text-xs text-fg-subtle">{formatRelative(n.created_at)}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-fg-muted">You&apos;re all caught up.</p>
            )}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Finance summary */}
        <Card>
          <CardHeader title="Savings & contributions" icon={<PiggyBank className="size-4" />}
            action={<Link href="/finance" className="text-sm font-medium text-primary hover:underline">Ledger</Link>} />
          <CardBody className="space-y-4">
            {[savings, contributions].filter(Boolean).map((b) => (
              <div key={b!.account_id}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm text-fg-muted">{b!.name}</span>
                  <span className="text-lg font-bold tabular-nums">{formatMoney(b!.confirmed_balance)}</span>
                </div>
                {b!.target_amount ? (
                  <>
                    <Progress value={percent(b!.confirmed_balance, b!.target_amount)} tone="green" className="mt-2" label={`${b!.name} target`} />
                    <p className="mt-1 text-xs text-fg-subtle">Target {formatMoney(b!.target_amount)}</p>
                  </>
                ) : null}
              </div>
            ))}
            <p className="rounded-xl bg-surface-muted p-3 text-xs text-fg-muted">
              Balances include approved entries only. They are organisation records, not bank balances.
            </p>
          </CardBody>
        </Card>

        {/* Birthdays */}
        <Card>
          <CardHeader title="Celebrations" icon={<Cake className="size-4" />}
            action={<Link href="/recognition" className="text-sm font-medium text-primary hover:underline">More</Link>} />
          <CardBody className="pt-3">
            {(birthdays as { member: string; full_name: string; avatar_url: string | null; birthday_month: number; birthday_day: number; days_until: number }[] | null)?.length ? (
              <ul className="space-y-3">
                {(birthdays as { member: string; full_name: string; avatar_url: string | null; birthday_month: number; birthday_day: number; days_until: number }[]).slice(0, 4).map((b) => (
                  <li key={b.member} className="flex items-center gap-3">
                    <Avatar name={b.full_name} src={b.avatar_url} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{b.full_name}</p>
                      <p className="text-xs text-fg-subtle">
                        {new Date(Date.UTC(2000, b.birthday_month - 1, b.birthday_day)).toLocaleDateString("en-NG", { day: "numeric", month: "long", timeZone: "UTC" })}
                      </p>
                    </div>
                    {b.days_until === 0 ? <Badge tone="lime">Today 🎉</Badge> : <Badge>in {b.days_until}d</Badge>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-8 text-center text-sm text-fg-muted">No birthdays in the next two weeks.</p>
            )}
          </CardBody>
        </Card>

        {/* AI */}
        <Card className="relative overflow-hidden">
          <div className="wedge absolute -bottom-6 -right-4 h-[74px] w-[100px] scale-150 bg-brand-lime/30" aria-hidden />
          <CardHeader title="Maximus AI" icon={<Sparkles className="size-4" />} description="Your personal growth coach" />
          <CardBody className="relative space-y-2">
            {["Plan my week to hit my prospecting target", "Help me follow up with a prospect", "How do I support a struggling downline?"].map((q) => (
              <Link key={q} href={`/ai?q=${encodeURIComponent(q)}`}
                className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2.5 text-sm hover:border-primary hover:bg-primary-soft">
                {q} <ArrowRight className="size-4 shrink-0 text-primary" aria-hidden />
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

    </div>
  );
}


function GoalStatusBadge({ status }: { status: MonthlyGoal["status"] }) {
  const map = {
    draft: <Badge>Draft</Badge>,
    submitted: <Badge tone="blue">Awaiting sponsor review</Badge>,
    approved: <Badge tone="green">Approved</Badge>,
    revision_requested: <Badge tone="amber">Revision requested</Badge>,
  } as const;
  return map[status];
}
