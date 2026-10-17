import Link from "next/link";
import { Compass, Download, Flame, Network, UserPlus, Users } from "lucide-react";
import { FocusList } from "@/components/growth-focus";
import { TrendBars } from "@/components/charts";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { topFocus, type FocusKey, type GrowthFocus } from "@/lib/growth";
import type { TeamMemberStat } from "@/lib/types";
import { formatDate, formatMoney, monthStart, todayIn } from "@/lib/utils";
import { CopyReferral } from "./copy-referral";
import { LiveTeam } from "./live-team";
import { OrgChart } from "./org-chart";
import { TeamExplorer } from "./team-explorer";

export const metadata = { title: "My Team" };

export default async function TeamPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const extended = viewer.can("view_extended_downline");
  const canSeeTeam = viewer.can("view_direct_downlines") || extended;

  const [{ data: sponsor }, statsRes, growthRes, { data: myFocus }, focusRes] = await Promise.all([
    viewer.profile.sponsor_id
      ? supabase.from("profiles").select("id, full_name, avatar_url, member_id, phone, whatsapp").eq("id", viewer.profile.sponsor_id).maybeSingle()
      : Promise.resolve({ data: null }),
    canSeeTeam ? supabase.rpc("team_member_stats", { p_root: viewer.id, p_max_depth: extended ? null : 1 }) : Promise.resolve({ data: [] }),
    canSeeTeam ? supabase.rpc("team_growth", { p_root: viewer.id, p_months: 6 }) : Promise.resolve({ data: [] }),
    supabase.rpc("growth_focus"),
    canSeeTeam ? supabase.rpc("team_focus", { p_root: viewer.id }) : Promise.resolve({ data: [] }),
  ]);
  const focusData = myFocus as GrowthFocus | null;
  const target = focusData?.duplication_target ?? 3;
  const focus: Record<string, FocusKey[]> = Object.fromEntries(
    ((focusRes.data as { member: string; focus: FocusKey[] }[] | null) ?? []).map((f) => [f.member, f.focus]));
  focus[viewer.id] = topFocus(focusData).map((a) => a.key);
  const myTop = topFocus(focusData);
  const team = (statsRes.data as TeamMemberStat[] | null) ?? [];
  const growth = (growthRes.data as { month: string; new_members: number }[] | null) ?? [];
  const direct = team.filter((m) => m.depth === 1).length;
  const active = team.filter((m) => m.is_active).length;
  const thisMonth = monthStart(todayIn(viewer.profile.timezone));
  const newThisMonth = team.filter((m) => m.joined_at >= thisMonth).length;

  return (
    <>
      <PageHeader eyebrow="Team" title="My team" description="Your sponsor line, your downlines and how everyone is doing."
        action={<>
          <LiveTeam viewerId={viewer.id} />
          {team.length > 0 && <LinkButton href="/api/export/team" variant="outline" size="sm" prefetch={false}><Download className="size-4" aria-hidden /> Export CSV</LinkButton>}
        </>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title="Your sponsor" icon={<Users className="size-4" />} />
          <CardBody>
            {sponsor ? (
              <div className="flex items-center gap-3">
                <Avatar name={sponsor.full_name} src={sponsor.avatar_url} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{sponsor.full_name}</p>
                  <p className="text-sm text-fg-subtle">{sponsor.member_id}</p>
                </div>
                {sponsor.whatsapp && (
                  <a href={`https://wa.me/${String(sponsor.whatsapp).replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer"
                    className="rounded-xl bg-success-soft px-3 py-2 text-sm font-medium text-success">WhatsApp</a>
                )}
              </div>
            ) : <p className="text-sm text-fg-muted">You don&apos;t have a sponsor on record. An administrator can set this.</p>}
          </CardBody>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Invite people to your team" icon={<UserPlus className="size-4" />}
            description="New members who register with your code are placed directly under you." />
          <CardBody>
            <CopyReferral code={viewer.profile.referral_code} memberId={viewer.profile.member_id} />
          </CardBody>
        </Card>
      </div>

      {canSeeTeam ? (
        <>
          <section className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Team summary">
            <StatCard label={extended ? "Total network" : "Team members"} value={team.length} icon={<Network className="size-4" />} />
            <StatCard label="Direct downlines" value={direct} icon={<Users className="size-4" />} tone="navy" />
            <StatCard label="Active" value={active} hint={`${team.length - active} inactive`} icon={<Flame className="size-4" />} tone="green" />
            <StatCard label="New this month" value={newThisMonth} icon={<UserPlus className="size-4" />} tone="lime" />
          </section>

          {team.length > 0 ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-3">
              <div className="xl:col-span-3">
                <TeamExplorer rootId={viewer.id} rootName={viewer.profile.full_name} rootCode={viewer.profile.member_id} rootAvatar={viewer.profile.avatar_url}
                  members={team} focus={focus} target={target} />
              </div>
              {myTop.length > 0 && (
                <Card className="h-fit xl:col-span-2">
                  <CardHeader title="Your focus right now" icon={<Compass className="size-4" />} description="What will grow you and your team the most"
                    action={<Link href="/growth" className="text-sm font-medium text-primary hover:underline">Tips & lessons</Link>} />
                  <CardBody><FocusList areas={myTop} compact /></CardBody>
                </Card>
              )}
              <Card className="h-fit">
                <CardHeader title="New registrations" description="Last 6 months" icon={<UserPlus className="size-4" />} />
                <CardBody>
                  <TrendBars data={growth.map((g) => ({ month: formatDate(g.month, { month: "short" }), joined: g.new_members }))}
                    xKey="month" series={[{ key: "joined", label: "New members" }]} caption="New team members per month" height={200} />
                  <p className="mt-4 text-sm text-fg-muted">
                    30-day team sales: <b className="text-fg">{formatMoney(team.reduce((a, m) => a + Number(m.sales), 0))}</b> across{" "}
                    <b className="text-fg">{team.reduce((a, m) => a + m.orders, 0)}</b> orders.
                  </p>
                </CardBody>
              </Card>
            </div>
          ) : (
            <StartChart viewerId={viewer.id} name={viewer.profile.full_name} code={viewer.profile.member_id} avatar={viewer.profile.avatar_url} target={target} focus={focus} />
          )}
        </>
      ) : (
        <StartChart viewerId={viewer.id} name={viewer.profile.full_name} code={viewer.profile.member_id} avatar={viewer.profile.avatar_url} target={target} focus={focus} />
      )}
    </>
  );
}

/** The chart before anyone has joined: just you, with your first recruits still to come. */
function StartChart({ viewerId, name, code, avatar, target, focus }: {
  viewerId: string; name: string; code: string; avatar: string | null; target: number; focus: Record<string, FocusKey[]>;
}) {
  return (
    <Card className="mt-6">
      <OrgChart rootId={viewerId} rootName={name} rootCode={code} rootAvatar={avatar} members={[]} focus={focus} target={target} />
      <EmptyState icon={<Network className="size-6" />} title="Your team starts here"
        description={`Share your invite link. Everyone who registers with it appears under you in this chart the moment they join. Aim for your first ${target}.`} />
    </Card>
  );
}
