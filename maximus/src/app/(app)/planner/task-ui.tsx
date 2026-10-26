"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { CalendarClock, Check, Plus, Repeat, Trash2, UserRound } from "lucide-react";
import { MicButton } from "@/components/voice";
import { Button } from "@/components/ui/button";
import { FormMessage, Input, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { PRIORITIES, TASK_CATEGORIES, addDays, type Task } from "@/lib/planner";
import { cn, formatDate } from "@/lib/utils";
import { addTaskAction, deleteTaskAction, moveTasksAction, toggleTaskAction } from "./actions";

/** Quick add: type (or say) the task, choose when, and press Enter. */
export function TaskQuickAdd({ today, memberId, compact = false }: { today: string; memberId?: string; compact?: boolean }) {
  const [state, action] = useActionState(addTaskAction, null);
  const [title, setTitle] = useState("");
  const [when, setWhen] = useState(today);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) setTitle(""); }, [state]);
  const tomorrow = addDays(today, 1);

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <FormMessage state={state} />
      {memberId && <input type="hidden" name="member_id" value={memberId} />}
      <div className="flex gap-2">
        <Input name="title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} required
          placeholder={memberId ? "e.g. Follow up with 2 prospects" : "Add a task, e.g. Invite 3 people"} aria-label="Task" className="flex-1" />
        <SubmitButton pendingLabel="…" aria-label="Add task"><Plus className="size-4" aria-hidden /><span className="hidden sm:inline">Add</span></SubmitButton>
      </div>
      <div className={cn("flex flex-wrap items-center gap-2", compact && "text-sm")}>
        <MicButton onText={(t) => setTitle((cur) => (cur ? `${cur} ${t}` : t))} />
        <div className="flex rounded-xl bg-surface-muted p-1 text-sm" role="radiogroup" aria-label="When">
          {[{ v: today, l: "Today" }, { v: tomorrow, l: "Tomorrow" }, { v: "", l: "Someday" }].map((o) => (
            <button key={o.l} type="button" role="radio" aria-checked={when === o.v} onClick={() => setWhen(o.v)}
              className={cn("rounded-lg px-2.5 py-1", when === o.v ? "bg-surface font-medium shadow-sm" : "text-fg-muted")}>{o.l}</button>
          ))}
        </div>
        <Input type="date" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Due date" className="h-9 w-auto text-sm" />
        <input type="hidden" name="due_date" value={when} />
        <Select name="priority" defaultValue="2" aria-label="Priority" className="h-9 w-auto text-sm">
          {PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label} priority</option>)}
        </Select>
        <Select name="category" defaultValue={memberId ? "prospecting" : "other"} aria-label="Category" className="h-9 w-auto text-sm">
          {TASK_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
        </Select>
        <Select name="repeat" defaultValue="none" aria-label="Repeat" className="h-9 w-auto text-sm">
          <option value="none">Doesn&apos;t repeat</option><option value="daily">Every day</option><option value="weekly">Every week</option>
        </Select>
      </div>
    </form>
  );
}

const PRIORITY_DOT = { 1: "bg-danger", 2: "bg-primary", 3: "bg-fg-subtle" } as const;

export function TaskRow({ task, today, assignerName }: { task: Task; today: string; assignerName?: string }) {
  const [pending, start] = useTransition();
  const [done, setDone] = useState(Boolean(task.completed_at));
  const overdue = !done && task.due_date && task.due_date < today;
  const category = TASK_CATEGORIES.find((c) => c.key === task.category)?.label;

  return (
    <li className={cn("group flex items-start gap-3 rounded-xl px-2 py-2.5 hover:bg-surface-muted/60", pending && "opacity-60")}>
      <button type="button" role="checkbox" aria-checked={done} aria-label={done ? `Mark "${task.title}" as not done` : `Complete "${task.title}"`}
        onClick={() => { const next = !done; setDone(next); start(async () => { const r = await toggleTaskAction(task.id, next); if (!r.ok) setDone(!next); }); }}
        className={cn("mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border-2 transition-colors",
          done ? "border-brand-green bg-brand-green text-brand-navy" : "border-border hover:border-primary")}>
        {done && <Check className="size-3.5" aria-hidden />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={cn("text-[15px] leading-snug", done && "text-fg-subtle line-through")}>
          <span className={cn("mr-2 inline-block size-2 rounded-full align-middle", PRIORITY_DOT[task.priority])} title={`${PRIORITIES.find((p) => p.key === task.priority)?.label} priority`} aria-hidden />
          {task.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
          {task.due_date && (
            <span className={cn(overdue ? "font-medium text-danger" : "text-fg-subtle")}>
              {task.due_date === today ? "Today" : task.due_date === addDays(today, 1) ? "Tomorrow" : formatDate(task.due_date, { weekday: "short", day: "numeric", month: "short" })}
            </span>
          )}
          {category && category !== "Other" && <Badge>{category}</Badge>}
          {task.repeat !== "none" && <Badge tone="blue"><Repeat className="size-3" aria-hidden />{task.repeat === "daily" ? "Daily" : "Weekly"}</Badge>}
          {assignerName && <Badge tone="lime"><UserRound className="size-3" aria-hidden />From {assignerName}</Badge>}
        </div>
        {task.notes && <p className="mt-1 text-sm text-fg-muted">{task.notes}</p>}
      </div>
      {!done && (
        <div className="flex shrink-0 gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
          {task.due_date !== today && (
            <Button variant="ghost" size="icon" className="size-11" aria-label="Move to today" title="Move to today"
              onClick={() => start(async () => { await moveTasksAction([task.id], today); })}>
              <CalendarClock className="size-4" aria-hidden />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="size-11 hover:text-danger" aria-label="Delete task" title="Delete"
            onClick={() => { if (confirm(`Delete "${task.title}"?`)) start(async () => { await deleteTaskAction(task.id); }); }}>
            <Trash2 className="size-4" aria-hidden />
          </Button>
        </div>
      )}
    </li>
  );
}

/** Carry yesterday's unfinished tasks forward in one tap. */
export function MoveAllButton({ ids, today, label }: { ids: string[]; today: string; label: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="secondary" disabled={pending} onClick={() => start(async () => { await moveTasksAction(ids, today); })}>
      <CalendarClock className="size-4" aria-hidden />{pending ? "Moving…" : label}
    </Button>
  );
}

/** One-tap "add to today" for a suggested task. The member decides. */
export function SuggestionButton({ title, category, today }: { title: string; category: string; today: string }) {
  const [pending, start] = useTransition();
  const [added, setAdded] = useState(false);
  return (
    <Button size="sm" variant={added ? "secondary" : "outline"} disabled={pending || added}
      onClick={() => start(async () => {
        const fd = new FormData();
        fd.set("title", title); fd.set("category", category); fd.set("due_date", today); fd.set("priority", "2"); fd.set("repeat", "none");
        const r = await addTaskAction(null, fd);
        if (r?.ok) setAdded(true);
      })}>
      {added ? <><Check className="size-4" aria-hidden />Added</> : <><Plus className="size-4" aria-hidden />Add</>}
    </Button>
  );
}

/** Realistic adjustment: spread a pile of overdue tasks over the next three days. */
export function SpreadButton({ ids, today }: { ids: string[]; today: string }) {
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant="primary" disabled={pending}
      onClick={() => start(async () => {
        const days = [today, addDays(today, 1), addDays(today, 2)];
        await Promise.all(days.map((d, i) => moveTasksAction(ids.filter((_, j) => j % 3 === i), d)));
      })}>
      {pending ? "Spreading…" : "Spread over 3 days"}
    </Button>
  );
}
