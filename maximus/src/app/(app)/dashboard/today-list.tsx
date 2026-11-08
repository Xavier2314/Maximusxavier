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
  const byDone = (a: TodayItem, b: TodayItem) => Number(done.has(a.id)) - Number(done.has(b.id));
  const work = items.filter((i) => i.kind !== "check").sort(byDone);
  const checks = items.filter((i): i is Extract<TodayItem, { kind: "check" }> => i.kind === "check");
  const checksDone = checks.filter((c) => done.has(c.id)).length;

  const tick = (item: Extract<TodayItem, { kind: "task" | "check" }>, size: "lg" | "sm" = "lg") => (
    <button type="button" role="checkbox" aria-checked={done.has(item.id)} onClick={() => toggle(item)}
      aria-label={done.has(item.id) ? `Mark "${item.title}" as not done` : `Done: ${item.title}`}
      className="grid size-11 shrink-0 place-items-center">
      <span className={cn("grid place-items-center rounded-full border-2 transition-colors", size === "lg" ? "size-[22px]" : "size-5",
        done.has(item.id) ? "border-success bg-success text-white dark:text-brand-navy" : "border-fg-subtle/50 hover:border-primary")}>
        {done.has(item.id) && <Check className="size-3.5" strokeWidth={3} aria-hidden />}
      </span>
    </button>
  );

  return (
    <>
      {tickable.length > 0 && (
        <p className="text-sm text-fg-subtle tabular-nums" aria-live="polite">{doneCount} of {tickable.length} done</p>
      )}
      {work.length > 0 && (
        <ul className="mt-2 divide-y divide-border">
          {work.map((item) => item.kind === "followup" ? (
            <li key={`f-${item.id}`} className="grid min-h-14 grid-cols-[44px_1fr_auto] items-center">
              <span className="grid size-11 place-items-center text-fg-subtle"><Phone className="size-4" aria-hidden /></span>
              <Link href={`/prospects/${item.id}`} className="min-w-0 py-2">
                <span className="block">Follow up with {item.name}</span>
                <span className={cn("block text-sm", item.overdue ? "text-danger" : "text-fg-subtle")}>
                  {item.overdue ? "Follow-up, overdue" : "Follow-up, due today"}
                </span>
              </Link>
              {item.phone ? (
                <a href={`https://wa.me/${item.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                  className="grid size-11 place-items-center rounded-lg text-success hover:bg-success-soft" aria-label={`WhatsApp ${item.name}`}>
                  <MessageCircle className="size-5" aria-hidden />
                </a>
              ) : <span />}
            </li>
          ) : item.kind === "task" ? (
            <li key={`t-${item.id}`} className="grid min-h-14 grid-cols-[44px_1fr] items-center">
              {tick(item)}
              <span className="min-w-0 py-2">
                <span className={cn("block", done.has(item.id) && "text-fg-subtle line-through decoration-fg-subtle/40")}>{item.title}</span>
                <span className={cn("block text-sm", item.overdue && !done.has(item.id) ? "text-danger" : "text-fg-subtle")}>{item.detail}</span>
              </span>
            </li>
          ) : null)}
        </ul>
      )}
      {checks.length > 0 && (
        <div className={cn(work.length > 0 && "mt-2 border-t border-border pt-3")}>
          <div className="flex items-baseline justify-between px-2">
            <h3 className="text-sm font-medium">Daily checklist</h3>
            <span className="text-sm text-fg-subtle tabular-nums">{checksDone} of {checks.length}</span>
          </div>
          <ul className="mt-1 grid sm:grid-cols-2">
            {checks.map((c) => (
              <li key={`c-${c.id}`} className="flex min-h-11 items-center">
                {tick(c, "sm")}
                <span className={cn("min-w-0 text-[15px]", done.has(c.id) && "text-fg-subtle line-through decoration-fg-subtle/40")}>{c.title}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
