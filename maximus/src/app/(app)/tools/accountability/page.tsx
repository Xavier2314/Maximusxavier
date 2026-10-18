import Link from "next/link";
import { Flame, Handshake, MessageCircle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { addDays } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { MOODS, elapsedSeconds, fmtMinutes, habitStreak, type FocusSession, type ToolGoal } from "@/lib/tools";
import { formatDate, formatRelative, todayIn } from "@/lib/utils";
import { BackToTools } from "../timer-page";
import {
  CheckinForm, CodeCard, DeadlineAnswer, EndButton, PartnerGoal, RequestForm, RequestRow, SharingForm, type Comment,
} from "./partner-ui";

export const metadata = { title: "Accountability partner" };

type Partnership = { partnership_id: string; since: string | null; partner_id: string; full_name: string; member_id: string; avatar_url: string | null };
type Req = { id: string; incoming: boolean; message: string | null; created_at: string; full_name: string; member_id: string; avatar_url: string | null };
type Sharing = { user_id: string; share_goals: boolean; share_habits: boolean; share_focus: boolean; share_score: boolean; checkin_morning: string | null; checkin_evening: string | null };
type Checkin = { id: string; user_id: string; checkin_date: string; slot: "morning" | "evening"; mood: number | null; plan: string | null; done: string | null; blockers: string | null; created_at: string };

export default async function AccountabilityPage() {
  const viewer = await requireViewer();
  const today = todayIn(viewer.profile.timezone);
  const supabase = await createClient();
  const [{ data: code }, { data: pRows }, { data: reqs }] = await Promise.all([
    supabase.rpc("my_accountability_code"),
    supabase.rpc("my_partnership"),
    supabase.rpc("my_partner_requests"),
  ]);
  const partnership = ((pRows ?? []) as Partnership[])[0];
  const requests = (reqs ?? []) as Req[];

  return (
    <>
      <PageHeader eyebrow="Accountability" title="Accountability partner"
        description="Pair up with one person who keeps you on track. You choose what they see, and they can never change your goals." action={<BackToTools c="accountability" />} />
      {partnership ? <Partner viewerId={viewer.id} p={partnership} today={today} /> : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {requests.length > 0 && (
              <Card>
                <CardHeader title="Requests" />
                <CardBody className="space-y-3">{requests.map((r) => <RequestRow key={r.id} r={r} />)}</CardBody>
              </Card>
            )}
            <Card>
              <CardHeader title="Find a partner" description="Ask a friend, teammate or anyone in Maximus for their code." />
              <CardBody><RequestForm /></CardBody>
            </Card>
            <Card>
              <EmptyState icon={<Handshake className="size-6" aria-hidden />} title="How it works"
                description="1. Share your code or enter theirs. 2. They accept. 3. You each choose what to share: goals, habits, focus time, score. 4. Check in morning and evening, cheer each other on and suggest deadlines. Nobody else, including sponsors and admins, can see your partnership." />
            </Card>
          </div>
          <CodeCard code={String(code ?? "")} />
        </div>
      )}
    </>
  );
}

async function Partner({ viewerId, p, today }: { viewerId: string; p: Partnership; today: string }) {
  const supabase = await createClient();
  const weekAgo = addDays(today, -6);
  const [{ data: sharing }, { data: goals }, { data: myGoals }, { data: habits }, { data: checks }, { data: sessions }, { data: checkins }, scoreRes] = await Promise.all([
    supabase.from("partner_sharing").select("*").eq("partnership_id", p.partnership_id),
    supabase.from("tool_goals").select("*").eq("user_id", p.partner_id).eq("status", "active").order("priority").limit(30).returns<ToolGoal[]>(),
    supabase.from("tool_goals").select("id, title").eq("user_id", viewerId).eq("status", "active"),
    supabase.from("habits").select("id, name, icon, days").eq("user_id", p.partner_id).eq("archived", false),
    supabase.from("habit_checks").select("habit_id, check_date").eq("user_id", p.partner_id).gte("check_date", addDays(today, -60)),
    supabase.from("focus_sessions").select("*").eq("user_id", p.partner_id).eq("status", "completed").neq("kind", "break").gte("started_at", `${weekAgo}T00:00:00`).returns<FocusSession[]>(),
    supabase.from("partner_checkins").select("*").eq("partnership_id", p.partnership_id).gte("checkin_date", addDays(today, -13)).order("created_at", { ascending: false }).returns<Checkin[]>(),
    supabase.rpc("productivity_score", { p_user: p.partner_id }),
  ]);
  const share = (sharing ?? []) as Sharing[];
  const mine = share.find((s) => s.user_id === viewerId);
  const theirs = share.find((s) => s.user_id === p.partner_id);
  const goalIds = [...(goals ?? []).map((g) => g.id), ...(myGoals ?? []).map((g) => g.id as string)];
  const { data: comments } = goalIds.length
    ? await supabase.from("goal_comments").select("*").in("goal_id", goalIds).order("created_at").returns<Comment[]>()
    : { data: [] as Comment[] };
  const first = p.full_name.split(" ")[0];
  const pendingForMe = (comments ?? []).filter((c) => c.kind === "deadline" && c.proposal_status === "pending" && c.author_id === p.partner_id);
  const focusMin = (sessions ?? []).reduce((a, s) => a + elapsedSeconds(s) / 60, 0);
  const score = scoreRes.error ? null : (scoreRes.data as { score: number | null } | null)?.score ?? null;
  const myToday = (checkins ?? []).filter((c) => c.user_id === viewerId && c.checkin_date === today);

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="space-y-6 lg:col-span-2">
        <Card>
          <CardBody className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Avatar name={p.full_name} src={p.avatar_url} size={52} />
              <div>
                <p className="text-lg font-semibold">{p.full_name}</p>
                <p className="text-sm text-fg-muted">{p.member_id}{p.since ? ` · partners since ${formatDate(p.since, { day: "numeric", month: "short", year: "numeric" })}` : ""}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              {theirs?.share_focus && <Badge tone="blue">{fmtMinutes(focusMin)} focus this week</Badge>}
              {theirs?.share_score && score != null && <Badge tone="green">Score {score}/100</Badge>}
              <Link href="/messages" className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-fg"><MessageCircle className="size-3.5" aria-hidden /> Chat with {first}</Link>
            </div>
          </CardBody>
        </Card>

        {pendingForMe.length > 0 && (
          <Card>
            <CardHeader title={`${first} suggested new deadlines`} description="Only you can change your goals. Accept or decline." />
            <CardBody className="space-y-2">
              {pendingForMe.map((c) => (
                <DeadlineAnswer key={c.id} id={c.id} goal={String((myGoals ?? []).find((g) => g.id === c.goal_id)?.title ?? "Goal")} date={c.proposed_deadline!} />
              ))}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title={`Check in with ${first}`} description="Morning: your plan. Evening: what you got done." />
          <CardBody>
            <CheckinForm partnershipId={p.partnership_id} today={today}
              existing={{ morning: myToday.find((c) => c.slot === "morning") ?? null, evening: myToday.find((c) => c.slot === "evening") ?? null }} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={`${first}'s goals`} description={theirs?.share_goals ? "Comment, cheer them on, ask for an update or suggest a deadline." : undefined} />
          <CardBody className="space-y-3">
            {!theirs?.share_goals ? <p className="text-sm text-fg-muted">{first} isn&apos;t sharing goals.</p>
              : (goals ?? []).length === 0 ? <p className="text-sm text-fg-muted">No active goals yet.</p>
              : (goals ?? []).map((g) => (
                <PartnerGoal key={g.id} goal={{ ...g, progress: Number(g.progress), target: g.target == null ? null : Number(g.target) }}
                  comments={(comments ?? []).filter((c) => c.goal_id === g.id)} today={today} partnerName={first} viewerId={viewerId} />
              ))}
          </CardBody>
        </Card>

        {theirs?.share_habits && (habits ?? []).length > 0 && (
          <Card>
            <CardHeader title={`${first}'s habits`} />
            <CardBody className="divide-y divide-border">
              {(habits ?? []).map((h) => {
                const set = new Set((checks ?? []).filter((c) => c.habit_id === h.id).map((c) => c.check_date as string));
                const streak = habitStreak(h.days as number[], set, today);
                return (
                  <div key={h.id} className="flex items-center justify-between py-2 text-sm">
                    <span>{h.icon ? `${h.icon} ` : ""}{h.name}</span>
                    <span className="flex items-center gap-3">
                      <Badge tone={set.has(today) ? "green" : "neutral"}>{set.has(today) ? "Done today" : "Not yet today"}</Badge>
                      <span className="inline-flex items-center gap-1 text-warning"><Flame className="size-4" aria-hidden />{streak}</span>
                    </span>
                  </div>
                );
              })}
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title="Recent check-ins" />
          <CardBody className="space-y-3">
            {(checkins ?? []).length === 0 ? <p className="text-sm text-fg-muted">No check-ins yet. Be the first.</p> : (checkins ?? []).map((c) => (
              <div key={c.id} className="rounded-xl bg-surface-muted px-4 py-3 text-sm">
                <p className="mb-1 flex flex-wrap items-center gap-2 font-medium">
                  {c.user_id === viewerId ? "You" : first} · {c.slot === "morning" ? "Morning plan" : "Evening review"}
                  {c.mood ? <span title={MOODS[c.mood - 1].label}>{MOODS[c.mood - 1].emoji}</span> : null}
                  <span className="text-xs font-normal text-fg-subtle">{formatRelative(c.created_at)}</span>
                </p>
                {c.plan && <p className="whitespace-pre-line"><b>Plan:</b> {c.plan}</p>}
                {c.done && <p className="whitespace-pre-line"><b>Done:</b> {c.done}</p>}
                {c.blockers && <p className="whitespace-pre-line text-fg-muted"><b>Blockers:</b> {c.blockers}</p>}
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="space-y-6">
        {mine && (
          <Card>
            <CardHeader title={`What ${first} can see`} description="Change any time. Takes effect immediately." />
            <CardBody><SharingForm partnershipId={p.partnership_id} initial={mine} /></CardBody>
          </Card>
        )}
        {theirs?.share_goals && (goals ?? []).some((g) => g.target) && (
          <Card>
            <CardHeader title="Their progress at a glance" />
            <CardBody className="space-y-3">
              {(goals ?? []).filter((g) => g.target).slice(0, 5).map((g) => (
                <div key={g.id}><p className="mb-1 truncate text-sm">{g.title}</p><Progress value={(Number(g.progress) / Number(g.target)) * 100} label={g.title} /></div>
              ))}
            </CardBody>
          </Card>
        )}
        <Card><CardBody><EndButton id={p.partnership_id} name={first} /></CardBody></Card>
      </div>
    </div>
  );
}
