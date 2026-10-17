"use client";

import { useActionState } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Evaluation } from "@/lib/types";
import { saveEvaluationAction } from "./actions";

const NUMBERS = [
  { name: "prospects", q: "How many prospects did you contact?" },
  { name: "presentations", q: "How many presentations did you make?" },
  { name: "follow_ups", q: "How many follow-ups did you complete?" },
  { name: "orders_generated", q: "How many orders did you generate?" },
  { name: "new_joins", q: "How many people joined your team?" },
  { name: "members_supported", q: "How many team members did you support?" },
] as const;

export function EvaluationForm({ evaluation, periods }: { evaluation?: Evaluation; periods: { value: string; label: string }[] }) {
  const [state, action] = useActionState(saveEvaluationAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />
      {evaluation && <input type="hidden" name="id" value={evaluation.id} />}
      {evaluation ? (
        <input type="hidden" name="period_date" value={evaluation.period_date} />
      ) : (
        <Field label="Evaluation period" htmlFor="period_date">
          <Select id="period_date" name="period_date" defaultValue={periods[0]?.value}>
            {periods.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </Select>
        </Field>
      )}

      <Field label="1. How much have you earned during this period?" htmlFor="earnings" error={e.earnings} hint="Self-reported; it helps you and your sponsor track progress.">
        <div className="relative">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle">₦</span>
          <Input id="earnings" name="earnings" inputMode="decimal" defaultValue={evaluation?.earnings ?? ""} placeholder="0" className="pl-8" />
        </div>
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        {NUMBERS.map(({ name, q }, i) => (
          <Field key={name} label={`${i + 2}. ${q}`} htmlFor={name} error={e[name]}>
            <Input id={name} name={name} type="number" min={0} inputMode="numeric" defaultValue={evaluation?.[name] ?? ""} placeholder="0" />
          </Field>
        ))}
      </div>

      <Field label="8. What challenges did you encounter?" htmlFor="challenges" optional error={e.challenges}>
        <Textarea id="challenges" name="challenges" defaultValue={evaluation?.challenges ?? ""} maxLength={2000} />
      </Field>
      <Field label="9. What are your priorities for the next five days?" htmlFor="priorities" error={e.priorities}>
        <Textarea id="priorities" name="priorities" defaultValue={evaluation?.priorities ?? ""} maxLength={2000} required />
      </Field>
      <Field label="10. What support do you need from your sponsor?" htmlFor="support_needed" optional error={e.support_needed}>
        <Textarea id="support_needed" name="support_needed" defaultValue={evaluation?.support_needed ?? ""} maxLength={2000} />
      </Field>

      <div className="flex justify-end border-t border-border pt-6">
        <SubmitButton size="lg" pendingLabel="Submitting…">{evaluation ? "Save changes" : "Submit evaluation"}</SubmitButton>
      </div>
    </form>
  );
}
