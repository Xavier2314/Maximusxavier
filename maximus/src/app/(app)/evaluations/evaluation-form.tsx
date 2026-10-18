"use client";

import { useActionState, useState } from "react";
import { AiFilledBanner, ModeTabs, TalkToAi, type FormMode } from "@/components/form-modes";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { VoiceTextarea } from "@/components/voice";
import type { Evaluation } from "@/lib/types";
import { arrangeAction } from "../ai/arrange-actions";
import { saveEvaluationAction } from "./actions";

const NUMBERS = [
  { name: "prospects", q: "Prospects contacted" },
  { name: "presentations", q: "Presentations made" },
  { name: "follow_ups", q: "Follow-ups completed" },
  { name: "orders_generated", q: "Orders generated" },
  { name: "new_joins", q: "People who joined your team" },
  { name: "members_supported", q: "Team members you supported" },
] as const;

type Prefill = Partial<Record<keyof Evaluation, string | number | null>>;

export function EvaluationForm({ evaluation, periods }: { evaluation?: Evaluation; periods: { value: string; label: string }[] }) {
  const [state, action] = useActionState(saveEvaluationAction, null);
  const [mode, setMode] = useState<FormMode>(evaluation?.free_text && !evaluation.priorities ? "write" : evaluation ? "form" : "ai");
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [spoken, setSpoken] = useState("");
  const [version, setVersion] = useState(0);
  const e = state?.errors ?? {};
  const val = (k: keyof Evaluation) => (prefill?.[k] ?? evaluation?.[k] ?? "") as string | number;

  return (
    <div className="space-y-6">
      <ModeTabs mode={mode} onChange={setMode} />

      {mode === "ai" && (
        <TalkToAi arrange={(t) => arrangeAction("evaluation", t)}
          placeholder="e.g. I made 35k this period, talked to 20 people, did 4 presentations, 2 people joined. Challenge was transport. Next 5 days I want to follow up 10 people…"
          onArranged={(data, text) => { setPrefill(data as Prefill); setSpoken(text); setVersion((v) => v + 1); setMode("form"); }} />
      )}

      {mode !== "ai" && (
        <form key={`${mode}-${version}`} action={action} className="space-y-6" noValidate>
          <FormMessage state={state} />
          <input type="hidden" name="mode" value={mode} />
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

          {mode === "write" ? (
            <>
              <Field label="Your evaluation, in your own words" htmlFor="free_text" error={e.free_text}
                hint="How did the last five days go? What did you achieve, what was hard, what's next, what help do you need?">
                <VoiceTextarea id="free_text" name="free_text" rows={9} maxLength={4000} defaultValue={evaluation?.free_text ?? ""}
                  placeholder="Type or tap Speak and talk about your five days…" />
              </Field>
              <Field label="How much did you earn? (optional)" htmlFor="earnings" error={e.earnings}>
                <div className="relative max-w-xs">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle">₦</span>
                  <Input id="earnings" name="earnings" inputMode="decimal" defaultValue={val("earnings")} placeholder="0" className="pl-8" />
                </div>
              </Field>
            </>
          ) : (
            <>
              {prefill && <AiFilledBanner />}
              {spoken && <input type="hidden" name="free_text" value={spoken} />}
              <Field label="How much did you earn during this period?" htmlFor="earnings" error={e.earnings} hint="Self-reported; it helps you and your sponsor track progress.">
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle">₦</span>
                  <Input id="earnings" name="earnings" inputMode="decimal" defaultValue={val("earnings")} placeholder="0" className="pl-8" />
                </div>
              </Field>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {NUMBERS.map(({ name, q }) => (
                  <Field key={name} label={q} htmlFor={name} error={e[name]}>
                    <Input id={name} name={name} type="number" min={0} inputMode="numeric" defaultValue={val(name)} placeholder="0" />
                  </Field>
                ))}
              </div>
              <Field label="Challenges" htmlFor="challenges" optional error={e.challenges}>
                <VoiceTextarea id="challenges" name="challenges" rows={2} defaultValue={String(val("challenges"))} maxLength={2000} placeholder="Type or tap Speak" />
              </Field>
              <Field label="Priorities for the next five days" htmlFor="priorities" error={e.priorities}>
                <VoiceTextarea id="priorities" name="priorities" rows={2} defaultValue={String(val("priorities"))} maxLength={2000} />
              </Field>
              <Field label="Support you need from your sponsor" htmlFor="support_needed" optional error={e.support_needed}>
                <VoiceTextarea id="support_needed" name="support_needed" rows={2} defaultValue={String(val("support_needed"))} maxLength={2000} />
              </Field>
            </>
          )}

          <div className="flex justify-end border-t border-border pt-6">
            <SubmitButton size="lg" pendingLabel="Submitting…">{evaluation ? "Save changes" : "Submit evaluation"}</SubmitButton>
          </div>
        </form>
      )}
    </div>
  );
}
