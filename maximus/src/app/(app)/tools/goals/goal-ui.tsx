"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Check, Pencil, Play, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { Badge, Progress } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { GOAL_CATEGORIES, HORIZONS, type ToolGoal } from "@/lib/tools";
import { cn, formatDate } from "@/lib/utils";
import { recordProgressAction, saveGoalAction, setGoalStatusAction } from "../actions";
import { safeAction } from "@/lib/report-error";
const safe_saveGoalAction = safeAction(saveGoalAction, { ok: false, message: "Couldn't save. The app may have just updated. Refresh the page and try again." });

export type GoalNote = {
  id: string; goal_id: string; author_id: string; kind: "comment" | "encourage" | "request_update" | "deadline";
  body: string | null; proposed_deadline: string | null; proposal_status: string | null; created_at: string;
};

const PRIORITY = { 1: { label: "High", tone: "red" }, 2: { label: "Normal", tone: "blue" }, 3: { label: "Low", tone: "neutral" } } as const;

export function GoalForm({ today, goal, onDone }: { today: string; goal?: ToolGoal; onDone?: () => void }) {
  const [state, action] = useActionState(safe_saveGoalAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (!state?.ok) return;
    if (!goal) formRef.current?.reset();
    onDone?.();
  }, [state, goal, onDone]);
  const id = goal?.id ?? "new";
  return (
    <form ref={formRef} action={action} className="space-y-3">
      <FormMessage state={state} />
      {goal && <input type="hidden" name="id" value={goal.id} />}
      <Field label="Goal" htmlFor={`title-${id}`}>
        <Input id={`title-${id}`} name="title" defaultValue={goal?.title} required maxLength={160} placeholder="e.g. Invite 20 prospects" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Type" htmlFor={`h-${id}`}>
          <Select id={`h-${id}`} name="horizon" defaultValue={goal?.horizon ?? "weekly"}>
            {HORIZONS.map((h) => <option key={h.key} value={h.key}>{h.label}</option>)}
          </Select>
        </Field>
        <Field label="Category" htmlFor={`c-${id}`}>
          <Select id={`c-${id}`} name="category" defaultValue={goal?.category ?? "business"}>
            {GOAL_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
          </Select>
        </Field>
        <Field label="Target" htmlFor={`t-${id}`} optional>
          <Input id={`t-${id}`} name="target" type="number" min={0} step="any" defaultValue={goal?.target ?? ""} placeholder="20" />
        </Field>
        <Field label="Unit" htmlFor={`u-${id}`} optional>
          <Input id={`u-${id}`} name="unit" defaultValue={goal?.unit ?? ""} maxLength={30} placeholder="prospects" />
        </Field>
        <Field label="Start" htmlFor={`s-${id}`}>
          <Input id={`s-${id}`} name="start_date" type="date" defaultValue={goal?.start_date ?? today} required />
        </Field>
        <Field label="Deadline" htmlFor={`d-${id}`} optional>
          <Input id={`d-${id}`} name="deadline" type="date" defaultValue={goal?.deadline ?? ""} />
        </Field>
      </div>
      <Field label="Priority" htmlFor={`p-${id}`}>
        <Select id={`p-${id}`} name="priority" defaultValue={String(goal?.priority ?? 2)}>
          <option value="1">High</option><option value="2">Normal</option><option value="3">Low</option>
        </Select>
      </Field>
      <Field label="Notes" htmlFor={`n-${id}`} optional>
        <Textarea id={`n-${id}`} name="description" defaultValue={goal?.description ?? ""} maxLength={2000} rows={2} placeholder="Why it matters, how you'll do it" />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Saving…">{goal ? "Save changes" : "Add goal"}</SubmitButton>
    </form>
  );
}

export function GoalCard({ goal, today, compact, notes = [], viewerId, partnerName = "Partner" }: {
  goal: ToolGoal; today: string; compact?: boolean; notes?: GoalNote[]; viewerId?: string; partnerName?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(goal.progress));
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const pct = goal.target ? Math.min(100, (goal.progress / goal.target) * 100) : goal.status === "completed" ? 100 : 0;
  const overdue = goal.status === "active" && goal.deadline && goal.deadline < today;
  const p = PRIORITY[goal.priority];

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-xl bg-surface-muted px-3 py-2 text-sm">
        <span className="flex items-center gap-2"><Check className="size-4 text-success" aria-hidden />{goal.title}</span>
        <span className="text-xs text-fg-subtle">{goal.completed_at ? formatDate(goal.completed_at) : ""}</span>
      </div>
    );
  }
  return (
    <Card>
      <CardBody className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold">{goal.title}</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Badge>{HORIZONS.find((h) => h.key === goal.horizon)?.label}</Badge>
              <Badge tone="blue">{GOAL_CATEGORIES.find((c) => c.key === goal.category)?.label}</Badge>
              <Badge tone={p.tone}>{p.label}</Badge>
              {goal.deadline && (
                <Badge tone={overdue ? "red" : "neutral"}><CalendarClock className="size-3" aria-hidden />{overdue ? "Overdue · " : "Due "}{formatDate(goal.deadline, { day: "numeric", month: "short" })}</Badge>
              )}
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => setEditing((v) => !v)} aria-label={editing ? "Close editor" : "Edit goal"}>
            {editing ? <X className="size-4" aria-hidden /> : <Pencil className="size-4" aria-hidden />}
          </Button>
        </div>
        {goal.description && !editing && <p className="text-sm text-fg-muted whitespace-pre-line">{goal.description}</p>}
        {editing ? <GoalForm today={today} goal={goal} onDone={() => setEditing(false)} /> : (
          <>
            {goal.target != null && (
              <div>
                <div className="mb-1 flex justify-between text-sm"><span className="tabular-nums">{goal.progress} / {goal.target} {goal.unit}</span><span className="tabular-nums text-fg-muted">{Math.round(pct)}%</span></div>
                <Progress value={pct} tone={pct >= 100 ? "green" : "blue"} label={`${goal.title} progress`} />
              </div>
            )}
            <form className="flex flex-wrap items-center gap-2" onSubmit={(e) => {
              e.preventDefault();
              start(async () => { const r = await recordProgressAction(goal.id, Number(value)); setMsg(r.message); });
            }}>
              <Input type="number" min={0} step="any" value={value} onChange={(e) => setValue(e.target.value)} className="h-9 w-24" aria-label="Progress" />
              <Button type="submit" size="sm" variant="outline" disabled={pending}>Update progress</Button>
              <Link href={`/tools/pomodoro?goal=${goal.id}`} className={cn("inline-flex items-center gap-1 text-sm text-primary")}><Play className="size-3.5" aria-hidden /> Focus on this</Link>
              <span className="flex-1" />
              {goal.target == null && (
                <Button size="sm" variant="success" disabled={pending} onClick={() => start(async () => { const r = await setGoalStatusAction(goal.id, "completed"); setMsg(r.message); })}>Mark done</Button>
              )}
              <Button size="sm" variant="ghost" disabled={pending} onClick={() => { if (confirm("Drop this goal?")) start(async () => { const r = await setGoalStatusAction(goal.id, "abandoned"); setMsg(r.message); }); }}>Drop</Button>
            </form>
            {msg && <p className="text-xs text-fg-muted" role="status">{msg}</p>}
            {notes.length > 0 && (
              <div className="space-y-1.5 border-t border-border pt-3">
                {notes.slice(-5).map((n) => (
                  <p key={n.id} className="text-sm">
                    <span className="font-medium">{n.author_id === viewerId ? "You" : partnerName}: </span>
                    {n.kind === "deadline"
                      ? <>suggested a deadline of {formatDate(n.proposed_deadline, { day: "numeric", month: "short" })} ({n.proposal_status === "pending" ? <Link href="/tools/accountability" className="text-primary">answer</Link> : n.proposal_status})</>
                      : <span className="text-fg-muted">{n.body}</span>}
                  </p>
                ))}
              </div>
            )}
          </>
        )}
      </CardBody>
    </Card>
  );
}
