"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Check, MoveRight } from "lucide-react";
import { toggleTaskAction } from "../../planner/actions";
import { setTaskQuadrantAction } from "../actions";
import { cn, formatDate } from "@/lib/utils";

type T = { id: string; title: string; due_date: string | null; important: boolean; urgent: boolean };

const QUADS = [
  { important: true, urgent: true, title: "Do now", hint: "Urgent and important", cls: "border-danger/40 bg-danger-soft/50" },
  { important: true, urgent: false, title: "Schedule", hint: "Important, not urgent: where growth happens", cls: "border-primary/40 bg-primary-soft/50" },
  { important: false, urgent: true, title: "Delegate or batch", hint: "Urgent, not important", cls: "border-warning/40 bg-warning-soft/50" },
  { important: false, urgent: false, title: "Drop or later", hint: "Neither", cls: "border-border bg-surface-muted/60" },
] as const;

export function Matrix({ tasks: initial, today }: { tasks: T[]; today: string }) {
  const [tasks, setTasks] = useState(initial);
  const [dragging, setDragging] = useState<string | null>(null);
  const [, start] = useTransition();

  function move(id: string, important: boolean, urgent: boolean) {
    setTasks((all) => all.map((t) => (t.id === id ? { ...t, important, urgent } : t)));
    start(async () => { await setTaskQuadrantAction(id, important, urgent, today); });
  }
  function done(id: string) {
    setTasks((all) => all.filter((t) => t.id !== id));
    start(async () => { await toggleTaskAction(id, true); });
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {QUADS.map((q) => {
          const list = tasks.filter((t) => t.important === q.important && t.urgent === q.urgent);
          return (
            <section key={q.title} className={cn("min-h-48 rounded-2xl border-2 p-4", q.cls, dragging && "border-dashed")}
              onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const id = e.dataTransfer.getData("text/plain"); if (id) move(id, q.important, q.urgent); setDragging(null); }}>
              <h2 className="font-semibold">{q.title} <span className="text-sm font-normal text-fg-muted">({list.length})</span></h2>
              <p className="mb-3 text-xs text-fg-muted">{q.hint}</p>
              <ul className="space-y-2">
                {list.map((t) => (
                  <li key={t.id} draggable onDragStart={(e) => { e.dataTransfer.setData("text/plain", t.id); setDragging(t.id); }} onDragEnd={() => setDragging(null)}
                    className="flex items-center gap-2 rounded-xl bg-surface px-3 py-2 text-sm shadow-sm">
                    <button type="button" onClick={() => done(t.id)} aria-label={`Complete ${t.title}`} className="grid size-5 shrink-0 place-items-center rounded-full border border-border hover:border-success hover:text-success">
                      <Check className="size-3" aria-hidden />
                    </button>
                    <span className="min-w-0 flex-1 truncate">{t.title}</span>
                    {t.due_date && <span className={cn("shrink-0 text-xs", t.due_date < today ? "text-danger" : "text-fg-subtle")}>{formatDate(t.due_date, { day: "numeric", month: "short" })}</span>}
                    <label className="sr-only" htmlFor={`q-${t.id}`}>Move {t.title}</label>
                    <select id={`q-${t.id}`} value={`${t.important}-${t.urgent}`} title="Move to…"
                      onChange={(e) => { const [i, u] = e.target.value.split("-"); move(t.id, i === "true", u === "true"); }}
                      className="w-6 shrink-0 cursor-pointer appearance-none bg-transparent text-transparent" style={{ backgroundImage: "none" }}>
                      {QUADS.map((x) => <option key={x.title} value={`${x.important}-${x.urgent}`} className="text-fg">{x.title}</option>)}
                    </select>
                    <MoveRight className="pointer-events-none -ml-6 size-4 shrink-0 text-fg-subtle" aria-hidden />
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
      <p className="mt-4 text-sm text-fg-muted">
        Important = High priority. Urgent = due today, tomorrow or overdue. Moving a task changes its priority and due date in your{" "}
        <Link href="/planner" className="text-primary">Daily planner</Link>. Drag on a computer, or use the arrow menu on a phone.
      </p>
    </>
  );
}
