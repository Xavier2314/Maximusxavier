import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight, CalendarCheck, ClipboardCheck, Clock, DoorOpen, Filter, HandCoins, LogOut, Megaphone, PiggyBank, QrCode,
  Target, TrendingUp, TriangleAlert, UserCheck, UserMinus, UserPlus, Users,
} from "lucide-react";
import { TrendBars } from "@/components/charts";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader, Progress, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate, formatMoney, formatRelative, percent } from "@/lib/utils";
import { OfficePicker } from "./office-picker";

export const metadata = { title: "Office overview" };

type Person = { id: string; full_name: string; avatar_url: string | null };
type OfficeDashboard = {
  office: { id: string; name: string; address: string | null };
  today: string;
  members_total: number; active_7d: number; inactive_7d: number; inactive_14d: number; new_this_month: number;
  present_now: number; checked_in_today: number; late_today: number; absent_today: number; checked_out_today: number; open_today: boolean;
  attendance_7d: number | null; attendance_30d: number | null; attendance_trend: { day: string; present: number }[];
  reported_earnings_month: number; confirmed_savings_month: number; sales_month: number;
  pending_payments: number; pending_corrections: number;
  goals_submitted: number; goals_awaiting_review: number; goals_missing: number; evaluations_done: number;
  prospects_added_month: number; followups_due: number; prospects_joined_month: number;
  top_earners: (Person & { total: number })[];
  needs_attention: (Person & { last_at: string | null })[];
};

export default async function OfficePage({ searchParams }: { searchParams: Promise<{ office?: string }> }) {
  const viewer = await requireViewer();
  // Office managers can browse every office they manage; team leaders without a managed
  // office can still see the dashboard of their own office, read-only (no manage_office needed).
  const canViewDashboard = viewer.offices.length > 0 || (viewer.isLeader && Boolean(viewer.profile.office_id));
  if (!canViewDashboard) redirect("/forbidden");
  const { office: wanted } = await searchParams;
  const officeId = viewer.offices.find((o) => o.id === wanted)?.id
    ?? viewer.offices.find((o) => o.id === viewer.profile.office_id)?.id
    ?? viewer.offices[0]?.id
    ?? viewer.profile.office_id!;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("office_dashboard", { p_office: officeId });
  if (error || !data) {
    return <EmptyState icon={<TriangleAlert className="size-6" />} title="Couldn't load this office" description="Please refresh the page." />;
  }
  const d = data as OfficeDashboard;
  const m = d.members_total;
  const trend = d.attendance_trend.map((t) => ({ day: formatDate(t.day, { day: "numeric", month: "short" }), present: t.present }));
  const waiting = [
    { label: "Payments to approve", count: d.pending_payments, href: "/admin/approvals", icon: HandCoins, show: viewer.can("approve_financial_transactions") || viewer.can("manage_office") },
    { label: "Attendance corrections", count: d.pending_corrections, href: "/admin/approvals", icon: Clock, show: true },
    { label: "Goals awaiting review", count: d.goals_awaiting_review, href: "/goals", icon: Target, show: viewer.can("review_member_goals") },
  ].filter((w) => w.show);

  return (
    <>
      <PageHeader eyebrow="Office view" title={d.office.name}
        description={<>{formatDate(d.today, { weekday: "long", day: "numeric", month: "long" })} · {d.open_today
          ? <span className="text-success">Open today</span> : <span>Closed today</span>}</>}
        action={<>
          <OfficePicker offices={viewer.offices} current={officeId} />
          {viewer.can("manage_office") && <LinkButton href={`/admin/offices/${officeId}/qr`} variant="outline" size="sm"><QrCode className="size-4" aria-hidden />QR poster</LinkButton>}
          {viewer.can("publish_announcements") && <LinkButton href="/announcements" variant="outline" size="sm"><Megaphone className="size-4" aria-hidden />Announce</LinkButton>}
        </>} />

      {/* Right now */}
      <section aria-label="Attendance right now" className="card mb-6 overflow-hidden">
        <div className="grid divide-y divide-border sm:grid-cols-[1.3fr_repeat(4,1fr)] sm:divide-x sm:divide-y-0">
          <Link href="/attendance/live" className="group flex items-center gap-4 p-5 hover:bg-surface-muted/60">
            <span className="relative grid size-12 place-items-center rounded-2xl bg-success-soft text-success">
              <DoorOpen className="size-6" aria-hidden />
              {d.present_now > 0 && <span className="absolute -right-0.5 -top-0.5 size-3 rounded-full bg-brand-green ring-2 ring-surface" aria-hidden />}
            </span>
            <span>
              <span className="block text-sm text-fg-muted">In the office now</span>
              <span className="text-3xl font-bold tabular-nums">{d.present_now}</span>
              <span className="ml-1 text-sm text-fg-subtle">of {m}</span>
            </span>
            <ArrowRight className="ml-auto size-4 text-fg-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          {[
            { label: "Checked in today", value: d.checked_in_today, icon: UserCheck },
            { label: "Late", value: d.late_today, icon: Clock, warn: d.late_today > 0 },
            { label: "Not in yet", value: d.open_today ? d.absent_today : "—", icon: UserMinus },
            { label: "Checked out", value: d.checked_out_today, icon: LogOut },
          ].map((s) => (
            <Link key={s.label} href="/attendance/register" className="flex items-center justify-between gap-3 p-5 hover:bg-surface-muted/60 sm:block">
              <span className="flex items-center gap-1.5 text-sm text-fg-muted"><s.icon className="size-4" aria-hidden />{s.label}</span>
              <span className={cn("text-2xl font-bold tabular-nums sm:mt-1 sm:block", s.warn && "text-warning")}>{s.value}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Office health">
        <StatCard label="Active members" value={`${d.active_7d} / ${m}`} hint="Active in the last 7 days" icon={<Users className="size-4" />} tone="green" />
        <StatCard label="Need a check-in call" value={d.inactive_7d} hint={`${d.inactive_14d} quiet for 14+ days`} icon={<TriangleAlert className="size-4" />} tone="lime" />
        <StatCard label="Attendance this week" value={d.attendance_7d == null ? "—" : `${d.attendance_7d}%`} hint="Of members, on open days" icon={<CalendarCheck className="size-4" />} />
        <StatCard label="Attendance, 30 days" value={d.attendance_30d == null ? "—" : `${d.attendance_30d}%`} hint={`${d.new_this_month} joined this month`} icon={<UserPlus className="size-4" />} tone="navy" />
      </section>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Daily attendance" description="Members checked in on each open day (last 2 weeks)" icon={<CalendarCheck className="size-4" />}
            action={<Link href="/attendance/register" className="text-sm font-medium text-primary hover:underline">Register</Link>} />
          <CardBody>
            {trend.some((t) => t.present > 0)
              ? <TrendBars data={trend} xKey="day" series={[{ key: "present", label: "Checked in" }]} caption="Members checked in per open day" />
              : <EmptyState icon={<CalendarCheck className="size-6" />} title="No check-ins yet"
                  description="Print the QR poster and put it at the entrance. Members scan it when they arrive." />}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Waiting for you" icon={<ClipboardCheck className="size-4" />} />
          <CardBody className="space-y-2 pt-3">
            {waiting.map((w) => (
              <Link key={w.label} href={w.href} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:border-primary/40 hover:bg-surface-muted/60">
                <w.icon className="size-4 text-fg-subtle" aria-hidden />
                <span className="flex-1 text-sm">{w.label}</span>
                {w.count > 0 ? <Badge tone="amber">{w.count}</Badge> : <Badge tone="green">Clear</Badge>}
              </Link>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="mb-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Goals & evaluations" icon={<Target className="size-4" />} description={formatDate(d.today, { month: "long" })} />
          <CardBody className="space-y-5">
            <div>
              <div className="mb-1.5 flex justify-between text-sm"><span className="text-fg-muted">Monthly goals submitted</span><b className="tabular-nums">{d.goals_submitted} / {m}</b></div>
              <Progress value={percent(d.goals_submitted, m)} label="Goals submitted" />
              {d.goals_missing > 0 && (
                <p className="mt-2 text-xs text-warning">
                  {d.goals_missing} {d.goals_missing === 1 ? "member has" : "members have"} no submitted goals for this month
                </p>
              )}
            </div>
            <div>
              <div className="mb-1.5 flex justify-between text-sm"><span className="text-fg-muted">5-day evaluations done</span><b className="tabular-nums">{d.evaluations_done} / {m}</b></div>
              <Progress value={percent(d.evaluations_done, m)} tone="green" label="Evaluations done" />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Recruitment" icon={<Filter className="size-4" />} description="This month, across the office" />
          <CardBody>
            <dl className="grid grid-cols-2 gap-3">
              {[
                { label: "Prospects added", value: d.prospects_added_month },
                { label: "Follow-ups due", value: d.followups_due, warn: d.followups_due > 0 },
                { label: "Prospects joined", value: d.prospects_joined_month },
                { label: "New members", value: d.new_this_month },
              ].map((x) => (
                <div key={x.label} className="rounded-xl bg-surface-muted/70 p-3">
                  <dt className="text-xs text-fg-muted">{x.label}</dt>
                  <dd className={cn("mt-0.5 text-xl font-bold tabular-nums", x.warn && "text-warning")}>{x.value}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Money this month" icon={<PiggyBank className="size-4" />} />
          <CardBody className="space-y-3">
            {[
              { label: "Earnings members reported", value: d.reported_earnings_month, note: "From evaluations, not verified" },
              { label: "Savings confirmed", value: d.confirmed_savings_month, note: "Approved entries only" },
              { label: "Product sales recorded", value: d.sales_month, note: "From recorded orders" },
            ].map((x) => (
              <div key={x.label} className="flex items-baseline justify-between gap-3">
                <span><span className="block text-sm">{x.label}</span><span className="text-xs text-fg-subtle">{x.note}</span></span>
                <b className="tabular-nums">{formatMoney(x.value)}</b>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Top earners this month" icon={<TrendingUp className="size-4" />} description="As reported in evaluations"
            action={<Link href="/leaderboard" className="text-sm font-medium text-primary hover:underline">Leaderboard</Link>} />
          <CardBody className="pt-3">
            {d.top_earners.length > 0 ? (
              <ol className="space-y-1">
                {d.top_earners.map((p, i) => (
                  <li key={p.id}>
                    <Link href={`/team/${p.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-muted">
                      <span className={cn("w-5 text-center text-sm font-bold", i === 0 ? "text-warning" : "text-fg-subtle")}>{i + 1}</span>
                      <Avatar name={p.full_name} src={p.avatar_url} size={34} />
                      <span className="flex-1 truncate text-sm font-medium">{p.full_name}</span>
                      <span className="text-sm font-semibold tabular-nums">{formatMoney(p.total)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            ) : <p className="py-6 text-center text-sm text-fg-muted">No earnings reported yet this month.</p>}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Reach out to" icon={<UserMinus className="size-4" />}
            description="No check-in, evaluation, order or prospect update for 7+ days"
            action={<Link href="/office/members?filter=quiet" className="text-sm font-medium text-primary hover:underline">All</Link>} />
          <CardBody className="pt-3">
            {d.needs_attention.length > 0 ? (
              <ul className="space-y-1">
                {d.needs_attention.map((p) => (
                  <li key={p.id}>
                    <Link href={`/team/${p.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-muted">
                      <Avatar name={p.full_name} src={p.avatar_url} size={34} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{p.full_name}</span>
                        <span className="text-xs text-fg-subtle">{p.last_at ? `Last active ${formatRelative(p.last_at)}` : "No activity yet"}</span>
                      </span>
                      <ArrowRight className="size-4 text-fg-subtle" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : <p className="py-6 text-center text-sm text-fg-muted">Everyone has been active this week. 🎉</p>}
          </CardBody>
        </Card>
      </div>

      <p className="mt-6 text-xs text-fg-subtle">
        Active means a check-in, evaluation, order or prospect update in the last 7 days. Attendance % counts verified or approved
        check-ins on the office&apos;s open days. GPS and QR checks make attendance hard to fake, but can&apos;t prove it completely.
      </p>
    </>
  );
}
