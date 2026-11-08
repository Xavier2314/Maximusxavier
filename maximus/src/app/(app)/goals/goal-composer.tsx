"use client";

import { useState } from "react";
import { AiFilledBanner, ModeTabs, TalkToAi, type FormMode } from "@/components/form-modes";
import { planGoalsAction, type GoalPlan } from "./actions";
import { GoalForm } from "./goal-form";
import type { MonthlyGoal } from "@/lib/types";

/** The saved goals in plain words, so Maximus AI adds to them instead of starting over. */
function describe(goal: MonthlyGoal) {
  const lines = [
    ["Income (₦)", goal.income_target], ["Product sales (₦)", goal.sales_target], ["Savings (₦)", goal.savings_target],
    ["Fiverr (₦)", goal.fiverr_target], ["Upwork (₦)", goal.upwork_target], ["Other freelancing (₦)", goal.freelance_other_target],
    ["Product sales (PV)", goal.product_pv_target], ["People to contact", goal.prospecting_target],
    ["New team members", goal.recruitment_target], ["Orders", goal.order_target],
  ].filter(([, v]) => v != null && Number(v) > 0).map(([k, v]) => `${k}: ${v}`);
  for (const c of goal.custom_goals ?? []) lines.push(`To do: ${c.title}${c.target ? ` (${c.target}${c.unit ? ` ${c.unit}` : ""})` : ""}`);
  if (goal.books) lines.push(`Books: ${goal.books}`);
  return lines.join("\n") || "Nothing yet";
}

/**
 * Three ways to set goals: talk to Maximus AI, write it yourself, or fill the form. With saved goals
 * (editing a draft or goals sent back), what you say is added to them.
 */
export function GoalComposer({ months, defaultMonth, goal }: { months: { value: string; label: string }[]; defaultMonth: string; goal?: MonthlyGoal }) {
  const [mode, setMode] = useState<FormMode>(goal ? "form" : "ai");
  const [plan, setPlan] = useState<GoalPlan | null>(null);
  const [text, setText] = useState("");
  const [version, setVersion] = useState(0);
  return (
    <div className="space-y-6">
      <ModeTabs mode={mode} onChange={setMode} />
      {mode === "ai" && (
        <TalkToAi
          arrange={async (t) => { const r = await planGoalsAction(t, goal ? describe(goal) : undefined); return { ok: r.ok, message: r.message, data: r.plan as unknown as Record<string, unknown> }; }}
          placeholder={goal ? "e.g. Add: read Go Pro, and bring in 2 more people…" : "e.g. This month I want to make 200k, bring in 3 people, talk to 60 prospects, save 30k and finish the prospecting course…"}
          onArranged={(data, t) => { setPlan(data as unknown as GoalPlan); setText(t); setVersion((v) => v + 1); setMode("form"); }} />
      )}
      {mode === "write" && <GoalForm key={`w-${version}`} simple goal={goal} months={months} defaultMonth={defaultMonth} planText={text} />}
      {mode === "form" && (
        <div className="space-y-4">
          {plan && <AiFilledBanner />}
          {plan?.summary && <p className="rounded-xl bg-surface-muted p-3 text-sm">{plan.summary}</p>}
          <GoalForm key={`f-${version}`} goal={goal} months={months} defaultMonth={defaultMonth} plan={plan} planText={plan ? text : undefined} />
        </div>
      )}
    </div>
  );
}
