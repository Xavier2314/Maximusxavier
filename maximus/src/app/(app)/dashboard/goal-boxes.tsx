"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import { togglePeriodGoalAction } from "../goals/period-actions";

export type BoxGoal = { id: string; title: string; target: number | null; unit: string | null; done: boolean };

/** One box of goals on Home (this week or today): tick them off here, speak to add more on Goals. */
function GoalBox({ title, period, goals }: { title: string; period: "weekly" | "daily"; goals: BoxGoal[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const done = goals.filter((g) => g.done).length;
  const toggle = (g: BoxGoal) => start(async () => { await togglePeriodGoalAction(g.id, !g.done); router.refresh(); });
  return (
    <section aria-label={title} className="flex flex-col rounded-[22px] bg-surface p-5 dark:border dark:border-border">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-[22px] leading-none tracking-[-0.02em]">{title}</h2>
        {goals.length > 0 && <span className="text-sm text-fg-muted tabular-nums">{done} of {goals.length} done</span>}
      </div>
      {goals.length ? (
        <ul className="mt-3 space-y-1">
          {goals.map((g) => (
            <li key={g.id}>
              <button type="button" onClick={() => toggle(g)} disabled={pending} aria-pressed={g.done}
                className="flex min-h-11 w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition-colors hover:bg-surface-muted">
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2",
                  g.done ? "border-tile-green bg-tile-green text-black" : "border-fg-subtle/50")} aria-hidden>
                  {g.done && <Check className="size-4" />}
                </span>
                <span className={cn("min-w-0 flex-1", g.done && "text-fg-muted line-through")}>{g.title}</span>
                {g.target != null && <span className="shrink-0 text-sm text-fg-muted tabular-nums">{g.target.toLocaleString("en-NG")}{g.unit ? ` ${g.unit}` : ""}</span>}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-fg-muted">No goals for {period === "weekly" ? "this week" : "today"} yet.</p>
      )}
      <Link href={`/goals?view=${period}`}
        className="mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-3 text-sm font-semibold text-primary hover:underline">
        <Mic className="size-4" aria-hidden />{goals.length ? "Speak to add more" : `Speak your ${period === "weekly" ? "weekly" : "daily"} goals`}
      </Link>
    </section>
  );
}

export function GoalBoxes({ weekly, daily }: { weekly: BoxGoal[]; daily: BoxGoal[] }) {
  return (
    <div className="grid gap-2.5 lg:grid-cols-2">
      <GoalBox title="Weekly goals" period="weekly" goals={weekly} />
      <GoalBox title="Daily goals" period="daily" goals={daily} />
    </div>
  );
}
