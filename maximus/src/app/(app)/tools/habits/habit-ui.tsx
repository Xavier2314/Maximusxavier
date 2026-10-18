"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Archive, Check, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Habit } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { addHabitAction, archiveHabitAction, toggleHabitAction } from "../actions";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function HabitForm() {
  const [state, action] = useActionState(addHabitAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-3">
      <FormMessage state={state} />
      <div className="flex gap-2">
        <Input name="icon" maxLength={4} placeholder="🔥" className="w-16 text-center" aria-label="Emoji (optional)" />
        <Input name="name" required maxLength={80} placeholder="e.g. Invite 3 people" aria-label="Habit" className="flex-1" />
      </div>
      <fieldset>
        <legend className="mb-1.5 text-sm font-medium">Days</legend>
        <div className="flex flex-wrap gap-1.5">
          {DAYS.map((d, i) => (
            <label key={d} className="cursor-pointer">
              <input type="checkbox" name="days" value={i + 1} defaultChecked className="peer sr-only" />
              <span className="inline-block rounded-lg border border-border px-2 py-1 text-xs peer-checked:border-primary peer-checked:bg-primary-soft peer-checked:text-primary">{d}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <Field label="Reminder time" htmlFor="reminder_time" optional hint="Shown in your planner reminders.">
        <Input id="reminder_time" name="reminder_time" type="time" />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Adding…">Add habit</SubmitButton>
    </form>
  );
}

export function HabitRow({ habit, week, today, checked, streak, rate }: {
  habit: Habit; week: string[]; today: string; checked: string[]; streak: number; rate: number | null;
}) {
  const [done, setDone] = useState(new Set(checked));
  const [pending, start] = useTransition();
  function toggle(d: string) {
    const on = !done.has(d);
    const next = new Set(done);
    if (on) next.add(d); else next.delete(d);
    setDone(next);
    start(async () => {
      const r = await toggleHabitAction(habit.id, d, on);
      if (!r.ok) setDone(new Set(done));
    });
  }
  return (
    <div className="rounded-2xl border border-border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="font-medium">{habit.icon ? `${habit.icon} ` : ""}{habit.name}</p>
        <div className="flex items-center gap-3 text-sm">
          <span className={cn("inline-flex items-center gap-1 tabular-nums", streak > 0 ? "text-warning" : "text-fg-subtle")} title="Current streak">
            <Flame className="size-4" aria-hidden />{streak}
          </span>
          {rate !== null && <span className="text-xs text-fg-muted">{rate}% in 30 days</span>}
          <Button variant="ghost" size="icon" className="size-8" aria-label={`Archive ${habit.name}`} disabled={pending}
            onClick={() => { if (confirm("Archive this habit? Its history is kept.")) start(async () => { await archiveHabitAction(habit.id); }); }}>
            <Archive className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d) => {
          const dow = new Date(`${d}T12:00:00Z`).getUTCDay() || 7;
          const due = habit.days.includes(dow);
          const on = done.has(d);
          return (
            <button key={d} type="button" onClick={() => toggle(d)} disabled={d > today}
              aria-pressed={on} aria-label={`${habit.name} on ${d}`}
              className={cn("flex flex-col items-center rounded-xl py-1.5 text-xs transition-colors",
                on ? "bg-brand-green text-brand-navy" : due ? "bg-surface-muted hover:bg-border" : "bg-surface-muted/40 text-fg-subtle",
                d === today && !on && "ring-2 ring-primary/40")}>
              <span>{DAYS[dow - 1].slice(0, 2)}</span>
              <span className="grid size-5 place-items-center">{on ? <Check className="size-4" aria-hidden /> : new Date(`${d}T12:00:00Z`).getUTCDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
