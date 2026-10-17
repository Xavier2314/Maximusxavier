import Link from "next/link";
import { CalendarClock, ChevronRight, ClipboardCheck, Plus, TrendingUp, Users } from "lucide-react";
import { TrendBars, TrendLines } from "@/components/charts";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Evaluation, TeamMemberStat } from "@/lib/types";
import { currentEvaluationPeriod, evaluationDates, formatDate, formatMoney, nextEvaluationDate, todayIn } from "@/lib/utils";

export const metadata = { title: "Evaluations" };

export default async function EvaluationsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const today = todayIn(viewer.profile.timezone);
  const period = currentEvaluationPeriod(today);
  const isReviewer = viewer.can("review_member_goals");

  const [{ data: mine }, teamRes, { data: teamEvals }] = await Promise.all([
    supabase.from("evaluations").select("*").eq("user_id", viewer.id).order("period_date", { ascending: false }).limit(24).returns<Evaluation[]>(),
    isReviewer ? supabase.rpc("team_member_stats", { p_root: viewer.id, p_max_depth: viewer.can("view_extended_downline") ? null : 1 }) : Promise.resolve({ data: [] }),
    isReviewer ? supabase.from("evaluations").select("id, user_id, submitted_at").eq("period_date", period).neq("user_id", viewer.id) : Promise.resolve({ data: [] }),
  ]);
  const evals = mine ?? [];
  const currentDone = evals.find((e) => e.period_date === period);
  const trend = [...evals].reverse().slice(-10).map((e) => ({
    period: formatDate(e.period_date, { day: "numeric", month: "short" }),
    prospects: e.prospects, presentations: e.presentations, earnings: Number(e.earnings),
  }));
  const team = (teamRes.data as TeamMemberStat[] | null) ?? [];
  const doneIds = new Map(((teamEvals ?? []) as { id: string; user_id: string }[]).map((e) => [e.user_id, e.id]));
  const schedule = evaluationDates(today);

  return (
    <>
      <PageHeader eyebrow="Evaluations" title="Five-day evaluations"
        description="Every 1st, 5th, 10th, 15th, 20th, 25th and 30th (or month end), reflect on your progress."
        action={!currentDone && <LinkButton href="/evaluations/new"><Plus className="size-4" aria-hidden /> Start evaluation</LinkButton>} />

      <section className="mb-6 card p-5">
        <p className="mb-3 text-sm font-medium">This month&apos;s schedule</p>
        <ol className="flex flex-wrap gap-2">
          {schedule.map((d) => {
            const done = evals.some((e) => e.period_date === d);
            const isCurrent = d === period;
            return (
              <li key={d} className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm ${done ? "bg-success-soft text-success" : isCurrent ? "bg-primary text-white" : d > today ? "bg-surface-muted text-fg-subtle" : "bg-warning-soft text-warning"}`}>
                <span className="font-semibold tabular-nums">{formatDate(d, { day: "numeric", month: "short" })}</span>
                <span className="text-xs">{done ? "Done" : isCurrent ? "Due now" : d > today ? "Upcoming" : "Missed"}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Current period" value={currentDone ? "Submitted" : "Open"} hint={formatDate(period, { day: "numeric", month: "long" })} icon={<ClipboardCheck className="size-4" />} tone={currentDone ? "green" : "lime"} />
        <StatCard label="Next evaluation" value={formatDate(nextEvaluationDate(today), { day: "numeric", month: "short" })} icon={<CalendarClock className="size-4" />} />
        <StatCard label="Prospects (last 6)" value={evals.slice(0, 6).reduce((a, e) => a + e.prospects, 0)} icon={<Users className="size-4" />} tone="navy" />
        <StatCard label="Earnings (last 6)" value={formatMoney(evals.slice(0, 6).reduce((a, e) => a + Number(e.earnings), 0))} icon={<TrendingUp className="size-4" />} tone="green" hint="Self-reported" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Activity trend" description="Prospects and presentations" icon={<TrendingUp className="size-4" />} />
          <CardBody>
            {trend.length > 1 ? <TrendLines data={trend} xKey="period" caption="Prospects and presentations per evaluation"
              series={[{ key: "prospects", label: "Prospects", color: "1" }, { key: "presentations", label: "Presentations", color: "2", dashed: true }]} />
              : <p className="py-10 text-center text-sm text-fg-muted">Submit two evaluations to see your trend.</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Earnings by period" description="Self-reported" icon={<TrendingUp className="size-4" />} />
          <CardBody>
            {trend.length > 0 ? <TrendBars data={trend} xKey="period" valueFormat="money" caption="Earnings per evaluation period" series={[{ key: "earnings", label: "Earnings" }]} />
              : <p className="py-10 text-center text-sm text-fg-muted">No evaluations yet.</p>}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card className={isReviewer ? "lg:col-span-2" : "lg:col-span-3"}>
          <CardHeader title="Your history" icon={<ClipboardCheck className="size-4" />} />
          <CardBody className="pt-2">
            {evals.length > 0 ? (
              <ul className="divide-y divide-border">
                {evals.map((e) => (
                  <li key={e.id}>
                    <Link href={`/evaluations/${e.id}`} className="flex items-center gap-4 py-3 hover:opacity-80">
                      <span className="w-24 text-sm font-medium">{formatDate(e.period_date, { day: "numeric", month: "short" })}</span>
                      <span className="flex-1 truncate text-sm text-fg-muted">{e.prospects} prospects · {e.presentations} presentations · {e.orders_generated} orders</span>
                      <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<ClipboardCheck className="size-6" />} title="No evaluations yet" action={<LinkButton href="/evaluations/new">Start your first</LinkButton>} />
            )}
          </CardBody>
        </Card>
        {isReviewer && (
          <Card className="h-fit">
            <CardHeader title="Team this period" icon={<Users className="size-4" />}
              description={`${team.filter((m) => doneIds.has(m.member)).length} of ${team.length} submitted`} />
            <CardBody className="pt-2">
              {team.length > 0 ? (
                <ul className="space-y-1">
                  {team.map((m) => {
                    const evalId = doneIds.get(m.member);
                    const inner = (
                      <>
                        <Avatar name={m.full_name} src={m.avatar_url} size={32} />
                        <span className="flex-1 truncate text-sm">{m.full_name}</span>
                        {evalId ? <Badge tone="green">Submitted</Badge> : <Badge tone="amber">Pending</Badge>}
                      </>
                    );
                    return (
                      <li key={m.member}>
                        {evalId
                          ? <Link href={`/evaluations/${evalId}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-muted">{inner}</Link>
                          : <div className="flex items-center gap-3 p-2">{inner}</div>}
                      </li>
                    );
                  })}
                </ul>
              ) : <p className="py-6 text-center text-sm text-fg-muted">No team members yet.</p>}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
