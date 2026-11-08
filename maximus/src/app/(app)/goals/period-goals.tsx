"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Plus, Trash2 } from "lucide-react";
import { TalkToAi } from "@/components/form-modes";
import { Button } from "@/components/ui/button";
import { FormMessage, Input } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { DeleteAllGoals } from "./delete-all";
import { planPeriodGoalsAction, savePeriodGoalsAction, togglePeriodGoalAction, type Period, type PeriodGoal } from "./period-actions";

type Saved = { id: string; title: string; target: number | null; unit: string | null; done: boolean };

/**
 * Weekly or daily goals: speak or type, let Maximus AI arrange a draft, change it, save it.
 * Saying more later adds to the list; nothing is added that you didn't say.
 */
export function PeriodGoals({ period, saved }: { period: Period; saved: Saved[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<PeriodGoal[] | null>(null);
  const [round, setRound] = useState(0);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const when = period === "weekly" ? "this week" : "today";

  const update = (i: number, patch: Partial<PeriodGoal>) => setDraft((d) => d && d.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  const save = () => start(async () => {
    const r = await savePeriodGoalsAction(period, draft ?? []);
    setNotice(r);
    if (r.ok) { setDraft(null); setRound((n) => n + 1); router.refresh(); }
  });
  const toggle = (g: Saved) => start(async () => { const r = await togglePeriodGoalAction(g.id, !g.done); if (!r.ok) setNotice(r); router.refresh(); });

  return (
    <div className="space-y-6">
      {draft ? (
        <section aria-label="Draft" className="space-y-3 rounded-[22px] bg-surface p-4 sm:p-5">
          <h2 className="text-xl">Your draft for {when}</h2>
          <ul className="space-y-2">
            {draft.map((g, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-2xl bg-bg p-2.5">
                <Input aria-label="Goal" value={g.title} onChange={(e) => update(i, { title: e.target.value })} className="min-w-[12rem] flex-1" />
                <Input aria-label="Target" inputMode="decimal" value={g.target ?? ""} placeholder="Target"
                  onChange={(e) => update(i, { target: e.target.value ? Number(e.target.value) || null : null })} className="w-24" />
                <Input aria-label="Unit" value={g.unit ?? ""} placeholder="e.g. people" onChange={(e) => update(i, { unit: e.target.value || null })} className="w-28" />
                <button type="button" onClick={() => setDraft((d) => d && d.filter((_, j) => j !== i))} aria-label={`Remove ${g.title}`}
                  className="grid size-11 place-items-center rounded-full text-fg-subtle hover:bg-surface hover:text-danger">
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <button type="button" onClick={() => setDraft((d) => [...(d ?? []), { title: "", target: null, unit: null, category: "other" }])}
            className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-primary">
            <Plus className="size-4" aria-hidden /> Add a goal
          </button>
          <FormMessage state={notice} />
          <div className="flex flex-wrap gap-2">
            <Button onClick={save} disabled={pending || !draft.length}>{pending ? "Saving…" : `Save ${draft.length === 1 ? "goal" : `${draft.length} goals`}`}</Button>
            <Button variant="ghost" onClick={() => setDraft(null)} disabled={pending}>Discard</Button>
          </div>
        </section>
      ) : (
        <>
          <TalkToAi key={round}
            placeholder={period === "weekly"
              ? "e.g. This week I want to invite 20 people, follow up with 10, sell 30k and read two chapters…"
              : "e.g. Today I'll call 5 prospects, post on WhatsApp status twice and attend the training…"}
            arrange={async (t) => {
              const r = await planPeriodGoalsAction(t, period, saved.filter((g) => !g.done).map((g) => g.title));
              return { ok: r.ok, message: r.message, data: r.goals ? { goals: r.goals } : undefined };
            }}
            onArranged={(data) => { setNotice(null); setDraft((data as { goals: PeriodGoal[] }).goals); }} />
          {notice?.ok && <FormMessage state={notice} />}
        </>
      )}

      <section aria-labelledby="saved-heading" className="space-y-3">
        <h2 id="saved-heading" className="text-xl">{period === "weekly" ? "This week" : "Today"}</h2>
        {saved.length ? (
          <ul className="space-y-2">
            {saved.map((g) => (
              <li key={g.id}>
                <button type="button" onClick={() => toggle(g)} disabled={pending} aria-pressed={g.done}
                  className="flex min-h-14 w-full items-center gap-3 rounded-2xl bg-surface px-4 py-3 text-left transition-colors hover:bg-surface-muted">
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
        ) : <p className="text-fg-muted">No goals for {when} yet. Speak or type them above.</p>}
        <DeleteAllGoals period={period} count={saved.length} />
      </section>
    </div>
  );
}
