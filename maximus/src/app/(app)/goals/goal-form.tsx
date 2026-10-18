"use client";

import { useActionState, useState } from "react";
import { BookOpen, ListChecks, Megaphone, NotebookPen, Package, PiggyBank, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { VoiceTextarea } from "@/components/voice";
import type { CustomGoal, MonthlyGoal } from "@/lib/types";
import { PROSPECTING_METHODS } from "@/lib/goals";
import { saveGoalAction, type GoalPlan } from "./actions";

type GoalLike = Partial<MonthlyGoal> & Partial<GoalPlan>;

function Money({ name, label, hint, value, error, required }: { name: string; label: string; hint?: string; value: unknown; error?: string[]; required?: boolean }) {
  return (
    <Field label={<>{label}{required && <span className="text-danger"> *</span>}</>} htmlFor={name} hint={hint} error={error}>
      <div className="relative">
        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle">₦</span>
        <Input id={name} name={name} inputMode="decimal" defaultValue={value == null ? "" : String(value)} placeholder="0" className="pl-8" aria-invalid={Boolean(error)} />
      </div>
    </Field>
  );
}

function Count({ name, label, hint, value, error, required, unit }: { name: string; label: string; hint?: string; value: unknown; error?: string[]; required?: boolean; unit?: string }) {
  return (
    <Field label={<>{label}{required && <span className="text-danger"> *</span>}</>} htmlFor={name} hint={hint} error={error}>
      <div className="relative">
        <Input id={name} name={name} inputMode="numeric" defaultValue={value == null ? "" : String(value)} placeholder="0" className={unit ? "pr-12" : undefined} aria-invalid={Boolean(error)} />
        {unit && <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">{unit}</span>}
      </div>
    </Field>
  );
}

function Section({ icon: Icon, title, note, children }: { icon: typeof Wallet; title: string; note?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4 rounded-2xl border border-border p-4 sm:p-5">
      <legend className="flex items-center gap-2 px-1 text-sm font-semibold">
        <Icon className="size-4 text-primary" aria-hidden />{title}
        {note && <span className="font-normal text-fg-subtle">· {note}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

export function GoalForm({ goal, months, defaultMonth, plan, planText, simple = false }: {
  goal?: MonthlyGoal; months: { value: string; label: string }[]; defaultMonth: string; plan?: GoalPlan | null; planText?: string; simple?: boolean;
}) {
  const [state, action] = useActionState(saveGoalAction, null);
  const g: GoalLike = { ...(goal ?? {}), ...Object.fromEntries(Object.entries(plan ?? {}).filter(([, v]) => v != null)) };
  const [custom, setCustom] = useState<CustomGoal[]>(plan?.actions?.length ? plan.actions : goal?.custom_goals?.length ? goal.custom_goals : []);
  const [methods, setMethods] = useState<string[]>(g.prospecting_methods ?? []);
  const [other, setOther] = useState(Boolean(g.prospecting_methods_other));
  const e = state?.errors ?? {};
  const toggle = (m: string) => setMethods((cur) => (cur.includes(m) ? cur.filter((x) => x !== m) : [...cur, m]));

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />
      <Field label="Month" htmlFor="month" error={e.month}>
        <Select id="month" name="month" defaultValue={goal?.month ?? defaultMonth} disabled={Boolean(goal)}>
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>
      {goal && <input type="hidden" name="month" value={goal.month} />}

      {simple ? (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Money name="savings_target" label="Savings target" value={g.savings_target} error={e.savings_target} required />
            <Money name="sales_target" label="Product sales" value={g.sales_target} error={e.sales_target} required />
            <Count name="product_pv_target" label="Product sales (PV)" value={g.product_pv_target} error={e.product_pv_target} required unit="PV" />
          </div>
        </>
      ) : (
        <>
          <Section icon={PiggyBank} title="Required every month">
            <div className="grid gap-4 sm:grid-cols-3">
              <Money name="savings_target" label="Savings target" hint="How much you'll save" value={g.savings_target} error={e.savings_target} required />
              <Money name="sales_target" label="Product sales" hint="Value of products you'll sell" value={g.sales_target} error={e.sales_target} required />
              <Count name="product_pv_target" label="Product sales (PV)" hint="Point value you'll sell" value={g.product_pv_target} error={e.product_pv_target} required unit="PV" />
            </div>
          </Section>

          <Section icon={Wallet} title="Income & freelancing" note="optional">
            <div className="grid gap-4 sm:grid-cols-2">
              <Money name="income_target" label="Total monthly income" value={g.income_target} error={e.income_target} />
              <Money name="fiverr_target" label="Fiverr" value={g.fiverr_target} error={e.fiverr_target} />
              <Money name="upwork_target" label="Upwork" value={g.upwork_target} error={e.upwork_target} />
              <Money name="freelance_other_target" label="Other freelancing" hint="Direct clients, other platforms" value={g.freelance_other_target} error={e.freelance_other_target} />
            </div>
          </Section>

          <Section icon={Megaphone} title="Prospecting & team" note="optional">
            <div className="grid gap-4 sm:grid-cols-3">
              <Count name="prospecting_target" label="People to contact" value={g.prospecting_target} error={e.prospecting_target} />
              <Count name="recruitment_target" label="New team members" hint="3 is a good start, no limit" value={g.recruitment_target} error={e.recruitment_target} />
              <Count name="order_target" label="Number of orders" value={g.order_target} error={e.order_target} />
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">How will you prospect?</p>
              <div className="flex flex-wrap gap-2">
                {PROSPECTING_METHODS.map((m) => (
                  <label key={m} className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary">
                    <input type="checkbox" name="prospecting_methods" value={m} checked={methods.includes(m)} onChange={() => toggle(m)} className="sr-only" />{m}
                  </label>
                ))}
                <label className="cursor-pointer rounded-full border border-border px-3 py-1.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft has-[:checked]:text-primary">
                  <input type="checkbox" checked={other} onChange={() => setOther((o) => !o)} className="sr-only" />Others
                </label>
              </div>
              {other && (
                <Input name="prospecting_methods_other" className="mt-3" maxLength={300} defaultValue={g.prospecting_methods_other ?? ""}
                  placeholder="Which other methods? e.g. LinkedIn, church groups, campus visits" aria-label="Other prospecting methods" />
              )}
            </div>
          </Section>

          <Section icon={BookOpen} title="Personal development" note="optional">
            <Field label="Books you plan to read" htmlFor="books" hint="One per line">
              <Textarea id="books" name="books" rows={3} maxLength={1000} defaultValue={g.books ?? ""} placeholder={"Go Pro – Eric Worre\nThe Compound Effect – Darren Hardy"} />
            </Field>
            <Field label="Other growth goals" htmlFor="personal_development_target" hint="Courses, skills, habits">
              <Textarea id="personal_development_target" name="personal_development_target" rows={2} maxLength={1000}
                defaultValue={g.personal_development_target ?? ""} placeholder="e.g. Finish the Prospecting Masterclass" />
            </Field>
          </Section>
        </>
      )}

      <Field label={<span className="inline-flex items-center gap-2"><NotebookPen className="size-4 text-primary" aria-hidden />My plan in my own words</span>}
        htmlFor="plan_text" hint="Write or speak your plan. Your sponsor and team leader will see this." optional={!simple}>
        <VoiceTextarea id="plan_text" name="plan_text" rows={simple ? 10 : 4} maxLength={4000} defaultValue={planText ?? goal?.plan_text ?? ""}
          placeholder="e.g. This month I want to bring in 3 people, make ₦150,000 and finish the prospecting course…" />
      </Field>

      {!simple && (
        <fieldset className="space-y-3">
          <legend className="inline-flex items-center gap-2 text-sm font-medium"><ListChecks className="size-4 text-primary" aria-hidden />My to-do list <span className="font-normal text-fg-subtle">(things to do this month)</span></legend>
          {custom.map((c, i) => (
            <div key={i} className="grid grid-cols-[1fr_90px_90px_auto] gap-2">
              <Input name="custom_title" defaultValue={c.title} placeholder="e.g. Invite 3 people a day" aria-label={`To-do ${i + 1}`} />
              <Input name="custom_target" defaultValue={c.target ?? ""} inputMode="numeric" placeholder="Target" aria-label="Target" />
              <Input name="custom_unit" defaultValue={c.unit ?? ""} placeholder="Unit" aria-label="Unit" />
              <Button variant="ghost" size="icon" onClick={() => setCustom((x) => x.filter((_, j) => j !== i))} aria-label="Remove to-do">
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          {custom.length < 8 && (
            <Button variant="outline" size="sm" onClick={() => setCustom((x) => [...x, { title: "" }])}>
              <Plus className="size-4" aria-hidden /> Add a to-do
            </Button>
          )}
        </fieldset>
      )}

      <p className="flex items-center gap-1.5 text-xs text-fg-subtle"><Package className="size-3.5" aria-hidden /><span className="text-danger">*</span> Required to submit. Drafts can be saved anytime.</p>
      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <SubmitButton variant="outline" name="intent" value="draft" pendingLabel="Saving…">Save draft</SubmitButton>
        <SubmitButton name="intent" value="submit" pendingLabel="Submitting…">Submit for review</SubmitButton>
      </div>
    </form>
  );
}
