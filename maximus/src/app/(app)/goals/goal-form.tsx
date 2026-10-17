"use client";

import { useActionState, useState } from "react";
import { Banknote, BookOpen, Plus, ShoppingBag, Trash2, TrendingUp, UserPlus, Users, PiggyBank } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { CustomGoal, MonthlyGoal } from "@/lib/types";
import { saveGoalAction } from "./actions";

const TARGETS = [
  { name: "income_target", label: "Monthly income target", icon: Banknote, money: true, hint: "What you plan to earn" },
  { name: "sales_target", label: "Sales target", icon: TrendingUp, money: true, hint: "Value of product sales" },
  { name: "prospecting_target", label: "Prospecting target", icon: Users, hint: "People you'll contact" },
  { name: "recruitment_target", label: "Recruitment target", icon: UserPlus, hint: "New team members" },
  { name: "order_target", label: "Product order target", icon: ShoppingBag, hint: "Number of orders" },
  { name: "savings_target", label: "Savings target", icon: PiggyBank, money: true, hint: "Amount to save this month" },
] as const;

export function GoalForm({ goal, months, defaultMonth }: { goal?: MonthlyGoal; months: { value: string; label: string }[]; defaultMonth: string }) {
  const [state, action] = useActionState(saveGoalAction, null);
  const [custom, setCustom] = useState<CustomGoal[]>(goal?.custom_goals?.length ? goal.custom_goals : []);
  const e = state?.errors ?? {};

  return (
    <form action={action} className="space-y-6" noValidate>
      <FormMessage state={state} />
      <Field label="Month" htmlFor="month" error={e.month}>
        <Select id="month" name="month" defaultValue={goal?.month ?? defaultMonth} disabled={Boolean(goal)}>
          {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
        </Select>
      </Field>
      {goal && <input type="hidden" name="month" value={goal.month} />}

      <div className="grid gap-4 sm:grid-cols-2">
        {TARGETS.map(({ name, label, icon: Icon, hint, ...t }) => (
          <Field key={name} label={<span className="inline-flex items-center gap-2"><Icon className="size-4 text-primary" aria-hidden />{label}</span>}
            htmlFor={name} hint={hint} error={e[name]}>
            <div className="relative">
              {"money" in t && <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle">₦</span>}
              <Input id={name} name={name} inputMode="numeric" defaultValue={goal?.[name] ?? ""} placeholder="0"
                className={"money" in t ? "pl-8" : undefined} aria-invalid={Boolean(e[name])} />
            </div>
          </Field>
        ))}
      </div>

      <Field label={<span className="inline-flex items-center gap-2"><BookOpen className="size-4 text-primary" aria-hidden />Personal development target</span>}
        htmlFor="personal_development_target" hint="e.g. Finish the Prospecting Masterclass, read one book" optional>
        <Textarea id="personal_development_target" name="personal_development_target" defaultValue={goal?.personal_development_target ?? ""} maxLength={1000} />
      </Field>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Custom goals <span className="font-normal text-fg-subtle">(optional)</span></legend>
        {custom.map((g, i) => (
          <div key={i} className="grid grid-cols-[1fr_90px_90px_auto] gap-2">
            <Input name="custom_title" defaultValue={g.title} placeholder="Goal" aria-label={`Custom goal ${i + 1}`} />
            <Input name="custom_target" defaultValue={g.target ?? ""} inputMode="numeric" placeholder="Target" aria-label="Target" />
            <Input name="custom_unit" defaultValue={g.unit ?? ""} placeholder="Unit" aria-label="Unit" />
            <Button variant="ghost" size="icon" onClick={() => setCustom((c) => c.filter((_, j) => j !== i))} aria-label="Remove custom goal">
              <Trash2 className="size-4" />
            </Button>
          </div>
        ))}
        {custom.length < 8 && (
          <Button variant="outline" size="sm" onClick={() => setCustom((c) => [...c, { title: "" }])}>
            <Plus className="size-4" aria-hidden /> Add custom goal
          </Button>
        )}
      </fieldset>

      <div className="flex flex-col-reverse gap-3 border-t border-border pt-6 sm:flex-row sm:justify-end">
        <SubmitButton variant="outline" name="intent" value="draft" pendingLabel="Saving…">Save draft</SubmitButton>
        <SubmitButton name="intent" value="submit" pendingLabel="Submitting…">Submit to my sponsor</SubmitButton>
      </div>
    </form>
  );
}
