import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader, Progress } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { fmtMinutes } from "@/lib/tools";
import { BackToTools } from "../timer-page";

export const metadata = { title: "Productivity score" };

type Score = { score: number | null; tasks_due: number; tasks_done: number; goal_progress_pct: number; habit_due: number; habit_done: number; focus_minutes: number };

export default async function ScorePage() {
  await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.rpc("productivity_score");
  const s = data as Score | null;
  const score = s?.score ?? null;
  const parts = s ? [
    { label: "Tasks completed", weight: "40%", detail: `${s.tasks_done} of ${s.tasks_due} due`, pct: s.tasks_due ? Math.min(100, (s.tasks_done / s.tasks_due) * 100) : null, href: "/planner" },
    { label: "Goal progress", weight: "30%", detail: `${s.goal_progress_pct}% average of goals with a target`, pct: s.goal_progress_pct, href: "/tools/goals" },
    { label: "Habit consistency", weight: "30%", detail: `${s.habit_done} of ${s.habit_due} habit days`, pct: s.habit_due ? Math.min(100, (s.habit_done / s.habit_due) * 100) : null, href: "/tools/habits" },
  ] : [];
  const message = score == null ? "Add tasks, goals with targets or habits to get a score."
    : score >= 80 ? "Excellent week. Keep the rhythm going." : score >= 60 ? "Solid. A couple more finished tasks will lift it."
    : score >= 40 ? "You're moving. Pick the one task that matters most today." : "Fresh start: choose one task and one habit for today.";

  return (
    <>
      <PageHeader eyebrow="Goals & productivity" title="Productivity score" description="Your last 7 days, from things you can check. No hidden points." action={<BackToTools c="goals" />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-3xl bg-brand-navy text-white shadow-lg">
          <div className="flex flex-col items-center px-5 py-10 text-center">
            <p className="text-sm text-white/80">This week</p>
            <p className="text-7xl font-bold tabular-nums">{score ?? "—"}</p>
            <p className="text-sm text-white/80">out of 100</p>
            <p className="mt-4 max-w-xs text-sm">{message}</p>
          </div>
        </div>
        <Card className="lg:col-span-2">
          <CardHeader title="How it's worked out" description="Parts with nothing to measure are left out and the rest are re-weighted." />
          <CardBody className="space-y-5">
            {parts.map((p) => (
              <div key={p.label}>
                <div className="mb-1 flex flex-wrap justify-between gap-2 text-sm">
                  <Link href={p.href} className="font-medium hover:text-primary">{p.label} <span className="text-fg-subtle">({p.weight})</span></Link>
                  <span className="text-fg-muted">{p.pct == null ? "Nothing to measure yet" : p.detail}</span>
                </div>
                <Progress value={p.pct ?? 0} label={p.label} />
              </div>
            ))}
            <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm">
              Focus time this week: <b>{fmtMinutes(s?.focus_minutes ?? 0)}</b>. It&apos;s shown for your information and doesn&apos;t add points by itself:
              results come from what you finish, not how long the timer ran.
            </p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
