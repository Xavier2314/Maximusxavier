"use client";

import { useState } from "react";
import { AiFilledBanner, ModeTabs, TalkToAi, type FormMode } from "@/components/form-modes";
import { planGoalsAction, type GoalPlan } from "./actions";
import { GoalForm } from "./goal-form";

/** Three ways to set goals: talk to Maximus AI, write it yourself, or fill the form. */
export function GoalComposer({ months, defaultMonth }: { months: { value: string; label: string }[]; defaultMonth: string }) {
  const [mode, setMode] = useState<FormMode>("ai");
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [text, setText] = useState("");
  const [version, setVersion] = useState(0);
  return (
    <div className="space-y-6">
      <ModeTabs mode={mode} onChange={setMode} />
      {mode === "ai" && (
        <TalkToAi
          arrange={async (t) => { const r = await planGoalsAction(t); return { ok: r.ok, message: r.message, data: r.plan as unknown as Record<string, unknown> }; }}
          placeholder="e.g. This month I want to make 200k, bring in 3 people, talk to 60 prospects, save 30k and finish the prospecting course…"
          onArranged={(data, t) => { setPlan(data as unknown as GoalPlan); setText(t); setVersion((v) => v + 1); setMode("form"); }} />
      )}
      {mode === "write" && <GoalForm key={`w-${version}`} simple months={months} defaultMonth={defaultMonth} planText={text} />}
      {mode === "form" && (
        <div className="space-y-4">
          {plan && <AiFilledBanner />}
          {plan?.summary && <p className="rounded-xl bg-surface-muted p-3 text-sm">{plan.summary}</p>}
          <GoalForm key={`f-${version}`} months={months} defaultMonth={defaultMonth} plan={plan} planText={plan ? text : undefined} />
        </div>
      )}
    </div>
  );
}
