"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Check, MessageCircle, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toggleTaskAction } from "../planner/actions";
import { toggleChecklistAction } from "./actions";

export type TodayItem =
  | { kind: "followup"; id: string; name: string; phone: string | null; overdue: boolean }
  | { kind: "task"; id: string; title: string; detail: string; overdue: boolean }
  | { kind: "check"; id: string; title: string; done: boolean };

/**
 * Home's one list for the day: prospect follow-ups, today's tasks and the daily checklist,
 * in that order. Ticking a task or checklist item saves it straight away, like the Planner does.
 */
export function TodayList({ items, date }: { items: TodayItem[]; date: string }) {
  const [done, setDone] = useState(() => new Set(items.filter((i) => i.kind === "check" && i.done).map((i) => i.id)));
  const [, start] = useTransition();
  const tickable = items.filter((i) => i.kind !== "followup");
  const doneCount = tickable.filter((i) => done.has(i.id)).length;

  function toggle(item: Extract<TodayItem, { kind: "task" | "check" }>) {
    const next = !done.has(item.id);
    const set = (on: boolean) => setDone((s) => { const n = new Set(s); if (on) n.add(item.id); else n.delete(item.id); return n; });
    set(next);
    start(async () => {
      if (item.kind === "task") {
        const r = await toggleTaskAction(item.id, next);
        if (!r.ok) set(!next);
      } else {
        await toggleChecklistAction(item.id, date, next);
      }
    });
  }

  // Unfinished first, so what's left is always at the top.
  const ordered = [...items].sort((a, b) => Number(done.has(a.id)) - Number(done.has(b.id)));

  return (
    <>
      {tickable.length > 0 && (
        <p className="text-sm text-fg-subtle tabular-nums" aria-live="polite">{doneCount} of {tickable.length} done</p>
      )}
      <ul className="mt-2 divide-y divide-border">
        {ordered.map((item) => item.kind === "followup" ? (
          <li key={`f-${item.id}`} className="grid min-h-14 grid-cols-[44px_1fr_auto] items-center">
            <span className="grid size-11 place-items-center text-fg-subtle"><Phone className="size-[18px]" aria-hidden /></span>
            <Link href={`/prospects/${item.id}`} className="min-w-0 py-2">
              <span className="block">Follow up with {item.name}</span>
              <span className={cn("block text-sm", item.overdue ? "text-danger" : "text-fg-subtle")}>
                {item.overdue ? "Follow-up, overdue" : "Follow-up, due today"}
              </span>
            </Link>
            {item.phone ? (
              <a href={`https://wa.me/${item.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                className="grid size-11 place-items-center rounded-xl text-success hover:bg-success-soft" aria-label={`WhatsApp ${item.name}`}>
                <MessageCircle className="size-5" aria-hidden />
              </a>
            ) : <span />}
          </li>
        ) : (
          <li key={`${item.kind}-${item.id}`} className="grid min-h-14 grid-cols-[44px_1fr] items-center">
            <button type="button" role="checkbox" aria-checked={done.has(item.id)} onClick={() => toggle(item as Extract<TodayItem, { kind: "task" | "check" }>)}
              aria-label={done.has(item.id) ? `Mark "${item.title}" as not done` : `Done: ${item.title}`}
              className="grid size-11 place-items-center">
              <span className={cn("grid size-[22px] place-items-center rounded-full border-2 transition-colors",
                done.has(item.id) ? "border-success bg-success text-white dark:text-brand-navy" : "border-fg-subtle/50 hover:border-primary")}>
                {done.has(item.id) && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
              </span>
            </button>
            <span className="min-w-0 py-2">
              <span className={cn("block", done.has(item.id) && "text-fg-subtle line-through decoration-fg-subtle/40")}>{item.title}</span>
              <span className={cn("block text-sm", item.kind === "task" && item.overdue && !done.has(item.id) ? "text-danger" : "text-fg-subtle")}>
                {item.kind === "task" ? item.detail : "Daily checklist"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
