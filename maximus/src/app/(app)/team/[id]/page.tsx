import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarCheck, ClipboardCheck, Flame, Mail, Phone, ShoppingBag, Target } from "lucide-react";
import { TrendLines } from "@/components/charts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, Progress, StatCard } from "@/components/ui/misc";
import { AttendanceBadge } from "@/components/attendance-badge";
import { ROLE_LABELS, requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, Evaluation, GoalProgress, MonthlyGoal, Order, Profile, RoleKey } from "@/lib/types";
import { formatDate, formatMoney, formatTime, monthStart, percent, todayIn } from "@/lib/utils";

export const metadata = { title: "Team member" };

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  if (id === viewer.id) redirect("/profile");
  const supabase = await createClient();
  const { data: member } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!member) notFound();

  const month = monthStart(todayIn());
  const [{ data: roles }, { data: attendance }, { data: goal }, { data: evaluations }, { data: orders }, { data: streak }] = await Promise.all([
    supabase.from("user_roles").select("roles(key)").eq("user_id", id),
    supabase.from("attendance").select("*").eq("user_id", id).order("check_in_at", { ascending: false }).limit(8).returns<Attendance[]>(),
    supabase.from("monthly_goals").select("*").eq("user_id", id).eq("month", month).maybeSingle<MonthlyGoal>(),
    supabase.from("evaluations").select("*").eq("user_id", id).order("period_date", { ascending: false }).limit(8).returns<Evaluation[]>(),
    supabase.from("orders").select("*").eq("member_id", id).order("order_date", { ascending: false }).limit(5).returns<Order[]>(),
    supabase.rpc("attendance_streak", { p_user: id }),
  ]);
  const progress = goal ? ((await supabase.rpc("goal_progress", { p_goal: goal.id })).data as GoalProgress | null) : null;
  // Activity is only returned by RLS to authorised leaders; a member viewing their sponsor sees the profile only.
  const canSeeActivity = streak !== null;
  const roleKeys = ((roles ?? []) as unknown as { roles: { key: RoleKey } | null }[]).map((r) => r.roles?.key).filter(Boolean) as RoleKey[];
  const trend = [...(evaluations ?? [])].reverse().map((e) => ({
    period: formatDate(e.period_date, { day: "numeric", month: "short" }), prospects: e.prospects, followups: e.follow_ups,
  }));

  return (
    <>
      <Link href="/team" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Team
      </Link>
      <section className="hero-gradient relative overflow-hidden rounded-[1.75rem] p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={member.full_name} src={member.avatar_url} size={80} className="ring-4 ring-white/15" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{member.full_name}</h1>
            <p className="mt-1 text-white/70">{member.member_id} · Joined {formatDate(member.joined_at, { month: "long", year: "numeric" })}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {roleKeys.filter((r) => r !== "member").map((r) => (
                <span key={r} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs ring-1 ring-white/15">{ROLE_LABELS[r]}</span>
              ))}
              {member.status !== "active" && <span className="rounded-full bg-danger px-2.5 py-0.5 text-xs">{member.status}</span>}
            </div>
          </div>
          <div className="flex gap-2">
            {member.phone && <a href={`tel:${member.phone}`} className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 hover:bg-white/15" aria-label={`Call ${member.full_name}`}><Phone className="size-5" /></a>}
            <a href={`mailto:${member.email}`} className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 hover:bg-white/15" aria-label={`Email ${member.full_name}`}><Mail className="size-5" /></a>
            {member.whatsapp && <a href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-xl bg-brand-green px-4 font-medium text-brand-navy">WhatsApp</a>}
          </div>
        </div>
      </section>

      {!canSeeActivity ? (
        <Card className="mt-6"><EmptyState icon={<Target className="size-6" />} title="Activity is private" description="Only this member's authorised leaders can see their attendance, goals and evaluations." /></Card>
      ) : (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="Attendance streak" value={`${streak ?? 0} days`} icon={<Flame className="size-4" />} />
            <StatCard label="Evaluations logged" value={evaluations?.length ?? 0} hint="Most recent 8" icon={<ClipboardCheck className="size-4" />} tone="lime" />
            <StatCard label="Goal status" value={goal ? goal.status.replace("_", " ") : "Not set"} icon={<Target className="size-4" />} tone="navy" />
            <StatCard label="Recent orders" value={formatMoney((orders ?? []).reduce((a, o) => a + Number(o.amount), 0))} hint={`${orders?.length ?? 0} orders`} icon={<ShoppingBag className="size-4" />} tone="green" />
          </section>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader title="Activity trend" description="Prospects and follow-ups per evaluation" icon={<ClipboardCheck className="size-4" />}
                action={evaluations?.[0] && <Link href={`/evaluations/${evaluations[0].id}`} className="text-sm font-medium text-primary hover:underline">Latest</Link>} />
              <CardBody>
                {trend.length > 1
                  ? <TrendLines data={trend} xKey="period" series={[{ key: "prospects", label: "Prospects", color: "1" }, { key: "followups", label: "Follow-ups", color: "2", dashed: true }]} caption="Evaluation activity trend" />
                  : <p className="py-10 text-center text-sm text-fg-muted">Not enough evaluations yet to show a trend.</p>}
              </CardBody>
            </Card>
            <Card>
              <CardHeader title={`Goals · ${formatDate(month, { month: "long" })}`} icon={<Target className="size-4" />}
                action={goal && <Link href={`/goals/${goal.id}`} className="text-sm font-medium text-primary hover:underline">Review</Link>} />
              <CardBody className="space-y-4">
                {goal && progress ? (
                  [
                    { l: "Income", v: progress.income, t: goal.income_target, m: true },
                    { l: "Sales", v: progress.sales, t: goal.sales_target, m: true },
                    { l: "Prospects", v: progress.prospecting, t: goal.prospecting_target },
                    { l: "Recruits", v: progress.recruitment, t: goal.recruitment_target },
                  ].filter((g) => Number(g.t) > 0).map((g) => (
                    <div key={g.l}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span className="text-fg-muted">{g.l}</span>
                        <span className="tabular-nums">{g.m ? formatMoney(g.v) : g.v} / {g.m ? formatMoney(g.t) : g.t}</span>
                      </div>
                      <Progress value={percent(Number(g.v), Number(g.t))} label={`${g.l} progress`} />
                    </div>
                  ))
                ) : <p className="py-10 text-center text-sm text-fg-muted">No goals submitted for this month.</p>}
              </CardBody>
            </Card>
          </div>

          <Card className="mt-6">
            <CardHeader title="Recent attendance" icon={<CalendarCheck className="size-4" />} />
            <CardBody className="pt-3">
              {attendance && attendance.length > 0 ? (
                <ul className="divide-y divide-border">
                  {attendance.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                      <span className="font-medium">{formatDate(a.attendance_date, { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span className="text-fg-muted">{formatTime(a.check_in_at)} – {a.check_out_at ? formatTime(a.check_out_at) : "…"}</span>
                      <AttendanceBadge status={a.status} checkedOut={Boolean(a.check_out_at)} />
                    </li>
                  ))}
                </ul>
              ) : <p className="py-6 text-center text-sm text-fg-muted">No attendance recorded yet.</p>}
            </CardBody>
          </Card>
          {member.bio && <Card className="mt-6"><CardBody><p className="text-sm text-fg-muted">“{member.bio}”</p></CardBody></Card>}
          <div className="mt-2 flex justify-end"><Badge>Data shown is limited to what your role permits</Badge></div>
        </>
      )}
    </>
  );
}
