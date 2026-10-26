"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Archive, Bell, Check, Flame, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { Habit } from "@/lib/tools";
import { cn } from "@/lib/utils";
import { addHabitAction, archiveHabitAction, toggleHabitAction } from "../actions";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const ICONS = ["🔥", "📞", "🤝", "📚", "🙏", "🏃", "💧", "💰", "🎯", "✍️", "🧘", "⏰"];
const IDEAS = ["Invite 3 people", "Read 10 pages", "Follow up with 2 prospects", "Pray / meditate", "Exercise 20 minutes", "Save ₦1,000"];
const ALL = [1, 2, 3, 4, 5, 6, 7];

function StepLabel({ n, children, htmlFor }: { n: number; children: React.ReactNode; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-center gap-2 text-sm font-semibold">
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">{n}</span>
      {children}
    </label>
  );
}

export function HabitForm() {
  const [state, action] = useActionState(addHabitAction, null);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("🔥");
  const [days, setDays] = useState<number[]>(ALL);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) { setTitle(""); setIcon("🔥"); setDays(ALL); ref.current?.reset(); } }, [state]);
  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  return (
    <form ref={ref} action={action} className="space-y-5" autoComplete="off">
      <FormMessage state={state} />

      <div>
        <StepLabel n={1} htmlFor="habit_title">What habit do you want to build?</StepLabel>
        <Input id="habit_title" name="habit_title" value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80}
          placeholder="e.g. Invite 3 people" autoComplete="off" autoCorrect="off" data-1p-ignore data-lpignore="true"
          className="h-12 border-2 text-base font-medium" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {IDEAS.map((idea) => (
            <button key={idea} type="button" onClick={() => setTitle(idea)}
              className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-fg-muted hover:bg-primary-soft hover:text-primary">+ {idea}</button>
          ))}
        </div>
      </div>

      <div>
        <StepLabel n={2}>Pick an icon</StepLabel>
        <input type="hidden" name="icon" value={icon} />
        <div className="grid grid-cols-6 gap-1.5" role="radiogroup" aria-label="Habit icon">
          {ICONS.map((ic) => (
            <button key={ic} type="button" role="radio" aria-checked={icon === ic} onClick={() => setIcon(ic)}
              className={cn("grid h-11 place-items-center rounded-xl border-2 text-xl transition-colors",
                icon === ic ? "border-primary bg-primary-soft" : "border-transparent bg-surface-muted hover:border-border")}>
              {ic}
            </button>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="w-full">
          <span className="mb-2 flex items-center justify-between gap-2">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <span className="grid size-6 place-items-center rounded-full bg-primary text-xs font-bold text-primary-fg">3</span>Which days?
            </span>
            <span className="flex gap-1 text-xs">
              <button type="button" onClick={() => setDays(ALL)} className="rounded-lg px-2 py-0.5 font-medium text-primary hover:bg-primary-soft">Every day</button>
              <button type="button" onClick={() => setDays([1, 2, 3, 4, 5])} className="rounded-lg px-2 py-0.5 font-medium text-primary hover:bg-primary-soft">Weekdays</button>
            </span>
          </span>
        </legend>
        <input type="hidden" name="days_set" value="1" />
        {days.map((d) => <input key={d} type="hidden" name="days" value={d} />)}
        <div className="grid grid-cols-7 gap-1">
          {DAYS.map((d, i) => {
            const on = days.includes(i + 1);
            return (
              <button key={d} type="button" aria-pressed={on} onClick={() => toggleDay(i + 1)}
                className={cn("h-10 rounded-xl text-xs font-bold transition-colors",
                  on ? "bg-primary text-primary-fg shadow-sm" : "border-2 border-border text-fg-subtle")}>
                {d}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div>
        <StepLabel n={4} htmlFor="reminder_time">Remind me at <span className="font-normal text-fg-subtle">(optional)</span></StepLabel>
        <div className="flex items-center gap-2">
          <Bell className="size-5 text-fg-muted" aria-hidden />
          <Input id="reminder_time" name="reminder_time" type="time" className="h-11 flex-1" />
        </div>
        <p className="mt-1 text-xs text-fg-subtle">Leave empty for no reminder.</p>
      </div>

      <SubmitButton className="h-12 w-full text-base font-semibold" pendingLabel="Adding…">
        <Plus className="size-5" aria-hidden /> Add {title.trim() ? `"${title.trim().slice(0, 30)}"` : "habit"}
      </SubmitButton>
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
  const todayDow = new Date(`${today}T12:00:00Z`).getUTCDay() || 7;
  const dueToday = habit.days.includes(todayDow);
  const doneToday = done.has(today);
  return (
    <div className={cn("rounded-2xl border-2 p-4 transition-colors", doneToday ? "border-brand-green/60 bg-success-soft/40" : "border-border")}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-surface-muted text-2xl" aria-hidden>{habit.icon || "✅"}</span>
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{habit.name}</p>
            <p className="text-xs text-fg-muted">
              {habit.days.length === 7 ? "Every day" : habit.days.map((d) => DAYS[d - 1]).join(", ")}
              {habit.reminder_time ? ` · reminder ${habit.reminder_time.slice(0, 5)}` : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums",
            streak > 0 ? "bg-warning-soft text-warning" : "bg-surface-muted text-fg-subtle")} title="Days in a row">
            <Flame className="size-4" aria-hidden />{streak} day{streak === 1 ? "" : "s"}
          </span>
          {rate !== null && <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-fg-muted">{rate}% this month</span>}
          <Button variant="ghost" size="icon" className="size-11" aria-label={`Archive ${habit.name}`} title="Archive habit" disabled={pending}
            onClick={() => { if (confirm("Archive this habit? Its history is kept.")) start(async () => { await archiveHabitAction(habit.id); }); }}>
            <Archive className="size-4" aria-hidden />
          </Button>
        </div>
      </div>
      {dueToday && (
        <button type="button" onClick={() => toggle(today)} disabled={pending}
          className={cn("mb-3 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-base font-bold transition-colors",
            doneToday ? "bg-brand-green text-brand-navy" : "bg-primary text-primary-fg hover:bg-primary-hover")}>
          <Check className="size-5" aria-hidden /> {doneToday ? "Done today! Tap to undo" : "Mark done for today"}
        </button>
      )}
      <div className="grid grid-cols-7 gap-1.5">
        {week.map((d) => {
          const dow = new Date(`${d}T12:00:00Z`).getUTCDay() || 7;
          const due = habit.days.includes(dow);
          const on = done.has(d);
          return (
            <button key={d} type="button" onClick={() => toggle(d)} disabled={d > today}
              aria-pressed={on} aria-label={`${habit.name} on ${d}${on ? ", done" : ""}`}
              className={cn("flex flex-col items-center rounded-xl py-2 text-xs font-semibold transition-colors",
                on ? "bg-brand-green text-brand-navy" : due ? "bg-surface-muted text-fg hover:bg-border" : "bg-surface-muted/40 text-fg-subtle",
                d === today && !on && "ring-2 ring-primary")}>
              <span>{DAYS[dow - 1].slice(0, 2)}</span>
              <span className="mt-0.5 grid size-6 place-items-center text-sm font-bold">{on ? <Check className="size-4" aria-hidden /> : new Date(`${d}T12:00:00Z`).getUTCDate()}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
