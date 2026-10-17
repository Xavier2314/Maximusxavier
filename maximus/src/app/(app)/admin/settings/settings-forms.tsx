"use client";

import { useActionState } from "react";
import { Checkbox, Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { saveActiveDefinitionAction } from "./actions";

export function ActiveDefinitionForm({ value }: { value: Record<string, unknown> }) {
  const [state, action] = useActionState(saveActiveDefinitionAction, null);
  const n = (k: string, d: number) => String(value[k] ?? d);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="Look-back window (days)" htmlFor="window_days"><Input id="window_days" name="window_days" type="number" min={7} max={120} defaultValue={n("window_days", 30)} /></Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Min. attendance days" htmlFor="min_attendance_days"><Input id="min_attendance_days" name="min_attendance_days" type="number" min={0} max={120} defaultValue={n("min_attendance_days", 4)} /></Field>
        <Field label="Min. prospects" htmlFor="min_prospects"><Input id="min_prospects" name="min_prospects" type="number" min={0} max={10000} defaultValue={n("min_prospects", 10)} /></Field>
        <Field label="Min. orders" htmlFor="min_orders"><Input id="min_orders" name="min_orders" type="number" min={0} max={10000} defaultValue={n("min_orders", 1)} /></Field>
        <Field label="Min. evaluations" htmlFor="min_evaluations"><Input id="min_evaluations" name="min_evaluations" type="number" min={0} max={30} defaultValue={n("min_evaluations", 3)} /></Field>
      </div>
      <label className="flex items-start gap-3 text-sm">
        <Checkbox name="require_all" defaultChecked={Boolean(value.require_all)} className="mt-0.5" />
        <span><span className="font-medium">Require all thresholds</span><span className="block text-fg-muted">Off: meeting any one counts as active. On: every non-zero threshold must be met.</span></span>
      </label>
      <SubmitButton pendingLabel="Saving…">Save definition</SubmitButton>
    </form>
  );
}
