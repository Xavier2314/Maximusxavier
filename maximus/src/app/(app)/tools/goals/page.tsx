import Link from "next/link";
import { Target } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { HORIZONS, type ToolGoal } from "@/lib/tools";
import { todayIn } from "@/lib/utils";
import { BackToTools } from "../timer-page";
import { GoalCard, GoalForm, type GoalNote } from "./goal-ui";

export const metadata = { title: "Goal tracker" };

export default async function GoalsToolPage({ searchParams }: { searchParams: Promise<{ h?: string }> }) {
  const viewer = await requireViewer();
  const { h } = await searchParams;
  const today = todayIn(viewer.profile.timezone);
  const supabase = await createClient();
  const { data } = await supabase.from("tool_goals").select("*").eq("user_id", viewer.id)
    .order("status").order("priority").order("deadline", { ascending: true, nullsFirst: false }).limit(300).returns<ToolGoal[]>();
  const [{ data: comments }, { data: partner }] = await Promise.all([
    (data ?? []).length ? supabase.from("goal_comments").select("id, goal_id, author_id, kind, body, proposed_deadline, proposal_status, created_at")
      .in("goal_id", (data ?? []).map((g) => g.id)).order("created_at") : Promise.resolve({ data: [] }),
    supabase.rpc("my_partnership"),
  ]);
  const partnerName = ((partner ?? []) as { full_name: string }[])[0]?.full_name.split(" ")[0] ?? "Partner";
  const notesFor = (id: string) => ((comments ?? []) as GoalNote[]).filter((c) => c.goal_id === id);
  const goals = (data ?? []).map((g) => ({ ...g, progress: Number(g.progress), target: g.target == null ? null : Number(g.target) }));
  const horizon = HORIZONS.find((x) => x.key === h)?.key;
  const active = goals.filter((g) => g.status === "active" && (!horizon || g.horizon === horizon));
  const done = goals.filter((g) => g.status === "completed").slice(0, 20);

  return (
    <>
      <PageHeader eyebrow="Goals & productivity" title="Goal tracker"
        description="Daily, weekly, monthly and quarterly goals. Separate from your official monthly office goals." action={<BackToTools c="goals" />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <nav className="flex flex-wrap gap-2" aria-label="Filter by horizon">
            <Link href="/tools/goals" className={`rounded-full px-3 py-1 text-sm ${!horizon ? "bg-primary text-primary-fg" : "bg-surface-muted"}`}>All</Link>
            {HORIZONS.map((x) => (
              <Link key={x.key} href={`/tools/goals?h=${x.key}`} className={`rounded-full px-3 py-1 text-sm ${horizon === x.key ? "bg-primary text-primary-fg" : "bg-surface-muted"}`}>{x.label}</Link>
            ))}
          </nav>
          {active.length === 0 ? (
            <Card><EmptyState icon={<Target className="size-6" aria-hidden />} title="No active goals here"
              description="Add a goal on the right. Break big goals into daily and weekly ones you can act on." /></Card>
          ) : active.map((g) => <GoalCard key={g.id} goal={g} today={today} notes={notesFor(g.id)} viewerId={viewer.id} partnerName={partnerName} />)}
          {done.length > 0 && (
            <Card>
              <CardHeader title="Completed" description="Well done." />
              <CardBody className="space-y-2">
                {done.map((g) => <GoalCard key={g.id} goal={g} today={today} compact />)}
              </CardBody>
            </Card>
          )}
        </div>
        <Card className="h-fit">
          <CardHeader title="Add a goal" />
          <CardBody><GoalForm today={today} /></CardBody>
        </Card>
      </div>
    </>
  );
}
