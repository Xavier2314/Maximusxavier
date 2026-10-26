import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, CalendarCheck, Compass, ClipboardCheck, Flame, Heart, History, ListChecks, Mail, Phone, ShieldCheck, ShoppingBag, Target } from "lucide-react";
import { TrendLines } from "@/components/charts";
import { DuplicationSummary, FocusList, coursesForFocus } from "@/components/growth-focus";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, Progress, StatCard } from "@/components/ui/misc";
import { ATTENDANCE_LABELS, AttendanceBadge } from "@/components/attendance-badge";
import { ROLE_LABELS, requireViewer } from "@/lib/auth";
import { topFocus, type GrowthFocus } from "@/lib/growth";
import { createClient } from "@/lib/supabase/server";
import type { Attendance, Evaluation, GoalProgress, MonthlyGoal, Order, Profile, RoleKey, TeamMemberStat } from "@/lib/types";
import { MemberManage } from "./member-manage";
import { rankLabel } from "@/lib/ranks";
import { TaskQuickAdd } from "../../planner/task-ui";
import { Encourage } from "../../why/why-ui";
import { WHY_CATEGORIES, type Motivation, type Task } from "@/lib/planner";
import { PositionSwitcher } from "@/components/position-switcher";
import { currentPosition } from "@/lib/positions";
import { OfficePlacement } from "./office-placement";
import { ChatButton } from "../../messages/chat-button";
import { formatDate, formatMoney, formatRelative, formatTime, monthStart, percent, todayIn } from "@/lib/utils";

export const metadata = { title: "Team member" };

export default async function MemberPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ view?: string }> }) {
  const { id } = await params;
  const { view } = await searchParams;
  const backHref = view === "office" ? "/office" : view === "team" ? "/office/team" : "/team";
  const viewer = await requireViewer();
  if (id === viewer.id) redirect("/profile");
  const supabase = await createClient();
  const { data: member } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!member) notFound();

  const month = monthStart(todayIn());
  const [{ data: roles }, { data: attendance }, { data: goal }, { data: evaluations }, { data: orders }, { data: streak }, { data: focusData }, { data: canChat }] = await Promise.all([
    supabase.from("user_roles").select("roles(key)").eq("user_id", id),
    supabase.from("attendance").select("*").eq("user_id", id).order("check_in_at", { ascending: false }).limit(8).returns<Attendance[]>(),
    supabase.from("monthly_goals").select("*").eq("user_id", id).eq("month", month).maybeSingle<MonthlyGoal>(),
    supabase.from("evaluations").select("*").eq("user_id", id).order("period_date", { ascending: false }).limit(8).returns<Evaluation[]>(),
    supabase.from("orders").select("*").eq("member_id", id).order("order_date", { ascending: false }).limit(5).returns<Order[]>(),
    supabase.rpc("attendance_streak", { p_user: id }),
    supabase.rpc("growth_focus", { p_user: id }),
    supabase.rpc("can_chat_with", { p_other: id }),
  ]);
  // Upline tools: add a photo, remove someone who left, and (Super Admin / Team Leader) set their office.
  const { data: link } = await supabase.from("team_relationships").select("depth")
    .eq("ancestor_id", viewer.id).eq("descendant_id", id).gte("depth", 1).maybeSingle();
  const inDownline = Boolean(link);
  const canEdit = inDownline || viewer.can("manage_roles");
  const canPlace = viewer.roles.includes("super_admin") || (viewer.roles.includes("team_leader") && inDownline);
  const canAssign = inDownline && (viewer.can("view_direct_downlines") || viewer.can("view_team_dashboard"));
  const [{ data: sharedWhys }, { data: assigned }] = await Promise.all([
    supabase.from("motivations").select("*").eq("user_id", id).eq("shared", true).order("created_at", { ascending: false }).returns<Motivation[]>(),
    canAssign ? supabase.from("tasks").select("*").eq("user_id", id).eq("assigned_by", viewer.id).order("created_at", { ascending: false }).limit(5).returns<Task[]>()
      : Promise.resolve({ data: [] as Task[] }),
  ]);
  const [{ data: subTeam }, { data: officeList }] = await Promise.all([
    canEdit ? supabase.rpc("team_member_stats", { p_root: id, p_max_depth: null }) : Promise.resolve({ data: [] }),
    canPlace ? supabase.rpc("list_public_offices") : Promise.resolve({ data: [] }),
  ]);
  const team = ((subTeam as TeamMemberStat[] | null) ?? []).filter((m) => m.status !== "deactivated" && m.depth >= 1)
    .sort((a, b) => a.depth - b.depth || a.full_name.localeCompare(b.full_name))
    .map((m) => ({ id: m.member, name: m.full_name, avatar: m.avatar_url, depth: m.depth, sponsorId: m.sponsor_id }));
  // RLS returns the NeoLife ID only to the member's sponsor line and admins, never their downline.
  const { data: priv } = await supabase.from("member_private").select("newlife_id").eq("user_id", id).maybeSingle();
  const neolife = (priv?.newlife_id as string | undefined) ?? null;
  const growth = focusData as GrowthFocus | null;
  const focusTop = topFocus(growth);
  const focusCourses = await coursesForFocus(supabase, focusTop);
  const firstName = member.full_name.split(" ")[0];
  const progress = goal ? ((await supabase.rpc("goal_progress", { p_goal: goal.id })).data as GoalProgress | null) : null;
  // Activity is only returned by RLS to authorised leaders; a member viewing their sponsor sees the profile only.
  const canSeeActivity = streak !== null;
  const roleKeys = ((roles ?? []) as unknown as { roles: { key: RoleKey } | null }[]).map((r) => r.roles?.key).filter(Boolean) as RoleKey[];
  const timeline = [
    { key: `joined`, at: member.joined_at, title: "Joined Maximus", dot: "bg-brand-lime" },
    ...(attendance ?? []).map((a) => ({ key: `a${a.id}`, at: a.check_in_at, title: "Checked in", detail: ATTENDANCE_LABELS[a.status], dot: "bg-brand-blue" })),
    ...(evaluations ?? []).map((e) => ({ key: `e${e.id}`, at: e.submitted_at, title: `Completed the ${formatDate(e.period_date, { day: "numeric", month: "short" })} evaluation`, detail: `${e.prospects} prospects`, dot: "bg-brand-green" })),
    ...(orders ?? []).map((o) => ({ key: `o${o.id}`, at: o.created_at, title: "Recorded an order", detail: formatMoney(o.amount), dot: "bg-[#0e7490]" })),
    ...(goal?.submitted_at ? [{ key: "g", at: goal.submitted_at, title: `Submitted ${formatDate(goal.month, { month: "long" })} goals`, dot: "bg-brand-navy dark:bg-white" }] : []),
  ].map((t) => ({ detail: undefined as string | undefined, ...t })).sort((a, b) => b.at.localeCompare(a.at)).slice(0, 12);
  const trend = [...(evaluations ?? [])].reverse().map((e) => ({
    period: formatDate(e.period_date, { day: "numeric", month: "short" }), prospects: e.prospects, followups: e.follow_ups,
  }));

  return (
    <>
      <Link href={backHref} className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> {view === "office" ? "Office" : "Team"}
      </Link>
      <section className="hero-gradient relative overflow-hidden rounded-2xl p-6 text-white sm:p-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <Avatar name={member.full_name} src={member.avatar_url} size={80} className="ring-4 ring-white/15" />
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{member.full_name}</h1>
            <p className="mt-1 text-white/70">{member.member_id} · Joined {formatDate(member.joined_at, { month: "long", year: "numeric" })}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {rankLabel(member.business_rank) && <span className="rounded-full bg-brand-lime px-2.5 py-0.5 text-xs font-semibold text-brand-navy">{rankLabel(member.business_rank)}</span>}
              {neolife && <span className="rounded-full bg-white/10 px-2.5 py-0.5 font-mono text-xs ring-1 ring-white/15">NeoLife ID {neolife}</span>}
              {roleKeys.filter((r) => r !== "member" && r !== "downline").map((r) => (
                <span key={r} className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs ring-1 ring-white/15">{ROLE_LABELS[r]}</span>
              ))}
              {member.status !== "active" && <span className="rounded-full bg-danger px-2.5 py-0.5 text-xs">{member.status}</span>}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {member.id !== viewer.id && member.status === "active" && canChat && <ChatButton memberId={member.id} view={view} />}
            {member.phone && <a href={`tel:${member.phone}`} className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 hover:bg-white/15" aria-label={`Call ${member.full_name}`}><Phone className="size-5" /></a>}
            <a href={`mailto:${member.email}`} className="grid size-11 place-items-center rounded-xl bg-white/10 ring-1 ring-white/15 hover:bg-white/15" aria-label={`Email ${member.full_name}`}><Mail className="size-5" /></a>
            {member.whatsapp && <a href={`https://wa.me/${member.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="inline-flex h-11 items-center rounded-xl bg-brand-green px-4 font-medium text-brand-navy">WhatsApp</a>}
          </div>
        </div>
      </section>

      {member.status === "active" && (canEdit || canPlace || viewer.can("manage_roles")) && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {viewer.can("manage_roles") && (
            <Card>
              <CardHeader title="Role" icon={<ShieldCheck className="size-4" />} description={`Switch ${firstName}'s position`} />
              <CardBody>
                <PositionSwitcher userId={member.id} name={member.full_name} current={currentPosition(roleKeys)}
                  earningsManager={roleKeys.includes("earnings_manager")} />
              </CardBody>
            </Card>
          )}
          {canEdit && <MemberManage member={{ id: member.id, name: member.full_name, avatar: member.avatar_url }} team={team} />}
          {canPlace && <OfficePlacement memberId={member.id} firstName={firstName} current={member.office_id}
            offices={(officeList as { id: string; name: string }[] | null) ?? []} />}
        </div>
      )}

      {(canAssign || (sharedWhys ?? []).length > 0) && (
        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          {canAssign && (
            <Card>
              <CardHeader title={`Give ${firstName} a task`} icon={<ListChecks className="size-4" />} description="It appears in their planner and they get a notification." />
              <CardBody className="space-y-4">
                <TaskQuickAdd today={todayIn(viewer.profile.timezone)} memberId={member.id} compact />
                {(assigned ?? []).length > 0 && (
                  <ul className="space-y-1.5 border-t border-border pt-3 text-sm">
                    {(assigned ?? []).map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-2">
                        <span className={t.completed_at ? "text-fg-subtle line-through" : ""}>{t.title}</span>
                        <Badge tone={t.completed_at ? "green" : "neutral"}>{t.completed_at ? "Done" : t.due_date ? formatDate(t.due_date, { day: "numeric", month: "short" }) : "Open"}</Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}
          {(sharedWhys ?? []).length > 0 && (
            <Card>
              <CardHeader title={`${firstName}'s why`} icon={<Heart className="size-4" />} description="Shared with you. Use it to encourage, never to pressure." />
              <CardBody className="space-y-4">
                {(sharedWhys ?? []).map((w) => (
                  <div key={w.id} className="rounded-2xl bg-surface-muted/70 p-4">
                    <p className="font-semibold">{WHY_CATEGORIES.find((c) => c.key === w.category)?.emoji} {w.title}</p>
                    {w.body && <p className="mt-1 line-clamp-3 text-sm text-fg-muted">{w.body}</p>}
                    <Encourage motivationId={w.id} firstName={firstName} />
                  </div>
                ))}
              </CardBody>
            </Card>
          )}
        </div>
      )}

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

          {growth && (
            <Card className="mt-6">
              <CardHeader title={`What ${firstName} should work on`} icon={<Compass className="size-4" />}
                description="Coach them on these areas first. Share the lessons with them."
                action={<Link href={`/prospects?member=${member.id}`} className="text-sm font-medium text-primary hover:underline">Their prospects</Link>} />
              <CardBody className="space-y-5">
                <DuplicationSummary focus={growth} who={firstName} />
                {focusTop.length > 0
                  ? <FocusList areas={focusTop} who={firstName} courses={focusCourses} />
                  : <p className="text-sm text-fg-muted">{firstName} is on target in every area. Recognise them!</p>}
              </CardBody>
            </Card>
          )}

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
          <Card className="mt-6">
            <CardHeader title="Activity timeline" icon={<History className="size-4" />} />
            <CardBody className="pt-3">
              {timeline.length > 0 ? (
                <ol className="relative ml-2 space-y-4 border-l-2 border-border pl-5">
                  {timeline.map((t) => (
                    <li key={t.key} className="relative">
                      <span className={`absolute -left-[27px] top-1 size-3 rounded-full ring-4 ring-surface ${t.dot}`} aria-hidden />
                      <p className="text-sm font-medium">{t.title}</p>
                      <p className="text-xs text-fg-subtle">{formatRelative(t.at)}{t.detail ? ` · ${t.detail}` : ""}</p>
                    </li>
                  ))}
                </ol>
              ) : <p className="py-6 text-center text-sm text-fg-muted">No activity yet.</p>}
            </CardBody>
          </Card>
          {member.bio && <Card className="mt-6"><CardBody><p className="text-sm text-fg-muted">“{member.bio}”</p></CardBody></Card>}
          <div className="mt-2 flex justify-end"><Badge>Data shown is limited to what your role permits</Badge></div>
        </>
      )}
    </>
  );
}
