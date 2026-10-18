"use client";

import { useOptimistic, useTransition } from "react";
import { Check } from "lucide-react";
import { Progress } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { toggleChecklistAction } from "./actions";

export function DailyChecklist({ items, done, date }: { items: { id: string; title: string }[]; done: string[]; date: string }) {
  const [checked, setChecked] = useOptimistic(new Set(done), (s, { id, on }: { id: string; on: boolean }) => {
    const n = new Set(s); if (on) n.add(id); else n.delete(id); return n;
  });
  const [, start] = useTransition();
  const pct = items.length ? Math.round((checked.size / items.length) * 100) : 0;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Progress value={pct} tone={pct === 100 ? "green" : "blue"} label="Checklist progress" />
        <span className="shrink-0 text-sm font-medium tabular-nums">{checked.size}/{items.length}</span>
      </div>
      <ul className="space-y-1.5">
        {items.map((it) => {
          const on = checked.has(it.id);
          return (
            <li key={it.id}>
              <button type="button" aria-pressed={on}
                onClick={() => start(async () => { setChecked({ id: it.id, on: !on }); await toggleChecklistAction(it.id, date, !on); })}
                className={cn("flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left text-sm transition-colors hover:bg-surface-muted", on && "text-fg-muted line-through")}>
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-lg border-2", on ? "border-brand-green bg-brand-green text-brand-navy" : "border-border")}>
                  {on && <Check className="size-4" aria-hidden />}
                </span>
                {it.title}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
