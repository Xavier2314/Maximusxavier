import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ClipboardCheck, Flame, Target, TrendingUp, TriangleAlert, Users } from "lucide-react";
import { TrendArea } from "@/components/charts";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TeamMemberStat } from "@/lib/types";
import { currentEvaluationPeriod, formatDate, formatMoney, formatRelative, percent, todayIn } from "@/lib/utils";

export const metadata = { title: "Team overview" };

export default async function TeamOverviewPage() {
  const viewer = await requireViewer();
  if (!viewer.isLeader) redirect("/forbidden");
  const period = currentEvaluationPeriod(todayIn(viewer.profile.timezone));
  return (
    <>
      <PageHeader eyebrow={viewer.offices.length ? "Office view" : "Team view"} title="Your team"
        description="Everyone you sponsor or lead: who is active, who needs you, and what is waiting for your review." />
      <LeaderSection viewerId={viewer.id} canSeeExtended={viewer.can("view_extended_downline")} period={period} />
    </>
  );
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
  const team = ((stats as TeamMemberStat[] | null) ?? []).filter((m) => m.status !== "deactivated");
  const active = team.filter((m) => m.is_active).length;
  const done = new Set((periodEvals ?? []).map((e) => e.user_id as string));
  const evalRate = percent(team.filter((m) => done.has(m.member)).length, team.length);
  const inactive = team.filter((m) => !m.is_active && m.status === "active").slice(0, 5);
  const growthData = ((growth as { month: string; new_members: number; total_members: number }[] | null) ?? [])
    .map((g) => ({ month: formatDate(g.month, { month: "short" }), total: g.total_members, joined: g.new_members }));

  return (
    <section className="space-y-6" aria-labelledby="team-heading">
      <div className="flex justify-end">
        <h2 id="team-heading" className="sr-only">Team at a glance</h2>
        <LinkButton href="/team" variant="outline" size="sm">Team tree <ArrowRight className="size-4" aria-hidden /></LinkButton>
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
                      <Link href={`/team/${m.member}?view=team`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-muted">
                        <Avatar name={m.full_name} src={m.avatar_url} size={32} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm">{m.full_name}</span>
                          <span className="text-xs text-fg-subtle">{m.last_activity ? `Last active ${formatRelative(m.last_activity)}` : "No activity yet"}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-4 text-center text-sm text-fg-muted">Everyone is active.</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </section>
  );
}

