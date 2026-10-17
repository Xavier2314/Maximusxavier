import Link from "next/link";
import {
  ArrowRight, Bell, Cake, CalendarClock, ClipboardCheck, Flame, GraduationCap, MapPin, PiggyBank, Sparkles,
  Target, TrendingUp, TriangleAlert, Users,
} from "lucide-react";
import { TrendArea } from "@/components/charts";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, Progress, ProgressRing, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AccountBalance, Attendance, GoalProgress, MonthlyGoal, Notification, TeamMemberStat } from "@/lib/types";
import {
  currentEvaluationPeriod, formatCompact, formatDate, formatMoney, formatRelative, formatTime, monthStart,
  nextEvaluationDate, percent, todayIn,
} from "@/lib/utils";

export const metadata = { title: "Dashboard" };

function greeting(tz: string) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: tz }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
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
    { data: notifications }, { data: birthdays }, { data: lessonsDone }, { data: publishedLessons },
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
  ]);

  const progress = goal ? ((await supabase.rpc("goal_progress", { p_goal: goal.id })).data as GoalProgress | null) : null;
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

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="hero-gradient relative overflow-hidden rounded-[1.75rem] p-6 text-white sm:p-8 animate-rise">
        <div className="wedge absolute -right-6 -top-4 h-[74px] w-[100px] scale-[2.4] bg-brand-green/25" aria-hidden />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-white/70">{greeting(tz)},</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">{firstName} 👋</h1>
            <p className="mt-2 text-white/70">
              {formatDate(today, { weekday: "long", day: "numeric", month: "long" }, tz)} · Member {viewer.profile.member_id}
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {checkedIn ? (
                <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm ring-1 ring-white/20">
                  <span className="size-2 rounded-full bg-brand-green" aria-hidden /> Checked in at {formatTime(openAttendance.check_in_at, tz)}
                </span>
              ) : (
                <LinkButton href="/attendance" variant="lime"><MapPin className="size-4" aria-hidden /> Check in</LinkButton>
              )}
              {!evaluation && (
                <LinkButton href="/evaluations/new" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10">
                  <ClipboardCheck className="size-4" aria-hidden /> Complete evaluation
                </LinkButton>
              )}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <ProgressRing value={goalPct} size={112}>
              <div>
                <p className="text-2xl font-bold">{goalPct}%</p>
                <p className="text-[11px] text-white/60">month goals</p>
              </div>
            </ProgressRing>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2"><Flame className="size-4 text-brand-lime" aria-hidden /><span><b>{(streak as number | null) ?? 0}</b> day streak</span></p>
              <p className="flex items-center gap-2"><CalendarClock className="size-4 text-brand-lime" aria-hidden /><span>Next evaluation <b>{formatDate(nextEvaluationDate(today), { day: "numeric", month: "short" })}</b></span></p>
            </div>
          </div>
        </div>
      </section>

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

      {viewer.isLeader && <LeaderSection viewerId={viewer.id} canSeeExtended={viewer.can("view_extended_downline")} period={period} />}
      {viewer.isAdmin && <AdminTeaser />}
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

async function LeaderSection({ viewerId, canSeeExtended, period }: { viewerId: string; canSeeExtended: boolean; period: string }) {
  const supabase = await createClient();
  const [{ data: stats }, { data: growth }, { data: pendingGoals }, { data: periodEvals }] = await Promise.all([
    supabase.rpc("team_member_stats", { p_root: viewerId, p_max_depth: canSeeExtended ? null : 1 }),
    supabase.rpc("team_growth", { p_root: viewerId, p_months: 6 }),
    supabase.from("monthly_goals").select("id, user_id, month, profiles!monthly_goals_user_id_fkey(full_name, avatar_url)")
      .eq("reviewer_id", viewerId).eq("status", "submitted").limit(5),
    supabase.from("evaluations").select("user_id").eq("period_date", period),
  ]);
  const team = (stats as TeamMemberStat[] | null) ?? [];
  const active = team.filter((m) => m.is_active).length;
  const done = new Set((periodEvals ?? []).map((e) => e.user_id as string));
  const evalRate = percent(team.filter((m) => done.has(m.member)).length, team.length);
  const inactive = team.filter((m) => !m.is_active && m.status === "active").slice(0, 5);
  const growthData = ((growth as { month: string; new_members: number; total_members: number }[] | null) ?? [])
    .map((g) => ({ month: formatDate(g.month, { month: "short" }), total: g.total_members, joined: g.new_members }));

  return (
    <section className="space-y-6" aria-labelledby="team-heading">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Leadership</p>
          <h2 id="team-heading" className="text-xl font-bold tracking-tight">Your team at a glance</h2>
        </div>
        <LinkButton href="/team" variant="outline" size="sm">View team <ArrowRight className="size-4" aria-hidden /></LinkButton>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Team members" value={team.length} icon={<Users className="size-4" />} hint={canSeeExtended ? "Whole downline" : "Direct downlines"} />
        <StatCard label="Active" value={active} icon={<Flame className="size-4" />} tone="green" hint={`${team.length - active} inactive`} />
        <StatCard label="Evaluations this period" value={`${evalRate}%`} icon={<ClipboardCheck className="size-4" />} tone="lime" hint="Completion rate" />
        <StatCard label="Team sales (30 days)" value={formatMoney(team.reduce((a, m) => a + Number(m.sales), 0))} icon={<TrendingUp className="size-4" />} tone="navy" />
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Team growth" description="Total members over the last 6 months" icon={<TrendingUp className="size-4" />} />
          <CardBody>
            {growthData.some((g) => g.total > 0)
              ? <TrendArea data={growthData} xKey="month" series={[{ key: "total", label: "Team members" }]} caption="Team size by month" />
              : <EmptyState icon={<Users className="size-6" />} title="Your team chart starts with your first recruit"
                  description="Share your referral link from your profile to invite people." />}
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Goals to review" icon={<Target className="size-4" />} />
            <CardBody className="pt-3">
              {pendingGoals && pendingGoals.length > 0 ? (
                <ul className="space-y-2">
                  {(pendingGoals as unknown as { id: string; month: string; profiles: { full_name: string; avatar_url: string | null } | null }[]).map((g) => (
                    <li key={g.id}>
                      <Link href={`/goals/${g.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-muted">
                        <Avatar name={g.profiles?.full_name ?? "Member"} src={g.profiles?.avatar_url} size={32} />
                        <span className="flex-1 truncate text-sm">{g.profiles?.full_name}</span>
                        <Badge tone="blue">{formatDate(g.month, { month: "short" })}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-4 text-center text-sm text-fg-muted">No goals waiting for you.</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Needs attention" icon={<TriangleAlert className="size-4" />} description="Inactive by your organisation's definition" />
            <CardBody className="pt-3">
              {inactive.length > 0 ? (
                <ul className="space-y-2">
                  {inactive.map((m) => (
                    <li key={m.member}>
                      <Link href={`/team/${m.member}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-muted">
                        <Avatar name={m.full_name} src={m.avatar_url} size={32} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{m.full_name}</span>
                          <span className="text-xs text-fg-subtle">{m.last_activity ? `Last active ${formatRelative(m.last_activity)}` : "No activity yet"}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-4 text-center text-sm text-fg-muted">Everyone is active. Great leadership! 🏆</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}

async function AdminTeaser() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("org_overview");
  const o = (data ?? {}) as Record<string, number>;
  return (
    <section className="card flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Organisation</p>
        <p className="mt-1 text-sm text-fg-muted">
          <b className="text-fg">{formatCompact(o.members_total)}</b> members · <b className="text-fg">{o.present_now ?? 0}</b> in office now ·{" "}
          <b className="text-fg">{o.pending_payments ?? 0}</b> payments and <b className="text-fg">{o.pending_corrections ?? 0}</b> corrections awaiting review
        </p>
      </div>
      <LinkButton href="/admin" variant="secondary" size="sm">Admin overview <ArrowRight className="size-4" aria-hidden /></LinkButton>
    </section>
  );
}
