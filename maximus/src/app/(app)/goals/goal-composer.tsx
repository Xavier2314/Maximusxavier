"use client";

import { useState, useTransition } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { VoiceTextarea } from "@/components/voice";
import { planGoalsAction, type GoalPlan } from "./actions";
import { GoalForm } from "./goal-form";

/** Tell Maximus AI your goals (type or speak) → it fills in the targets and to-do list for you. */
export function GoalComposer({ months, defaultMonth }: { months: { value: string; label: string }[]; defaultMonth: string }) {
  const [text, setText] = useState("");
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [version, setVersion] = useState(0);
  const [pending, start] = useTransition();
  const build = () => start(async () => {
    const r = await planGoalsAction(text);
    setNotice(r);
    if (r.ok && r.plan) { setPlan(r.plan); setVersion((v) => v + 1); }
  });
  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-primary/30 bg-primary-soft/40 p-5" aria-labelledby="ai-plan">
        <h2 id="ai-plan" className="flex items-center gap-2 font-semibold"><Sparkles className="size-4 text-primary" aria-hidden /> Plan with Maximus AI</h2>
        <p className="mt-1 text-sm text-fg-muted">Type or tap <b>Speak</b> and say what you want to achieve this month. Maximus AI fills in your targets and a to-do list below.</p>
        <div className="mt-3 space-y-3">
          <VoiceTextarea value={text} onValueChange={setText} rows={4} maxLength={4000} aria-label="Your goals in your own words"
            placeholder="e.g. I want to make 200k this month, bring in 3 people, talk to 60 prospects and save 30k…" />
          <FormMessage state={notice} />
          <Button onClick={build} disabled={pending || text.trim().length < 5}><Sparkles className="size-4" aria-hidden />{pending ? "Building your plan…" : "Build my plan"}</Button>
          {plan?.summary && <p className="rounded-xl bg-surface p-3 text-sm">{plan.summary}</p>}
        </div>
      </section>
      <GoalForm key={version} months={months} defaultMonth={defaultMonth} plan={plan} planText={plan ? text : undefined} />
    </div>
  );
}
