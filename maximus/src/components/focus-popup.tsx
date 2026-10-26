"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Compass, X } from "lucide-react";
import { buttonClass } from "@/components/ui/button";

export type PopupArea = { key: string; title: string; why: string; tip: string };

/** Shows the member's top focus areas once a week when they open the app. */
export function FocusPopup({ areas, week }: { areas: PopupArea[]; week: string }) {
  const [open, setOpen] = useState(false);
  const storageKey = `maximus-focus-seen-${week}`;

  useEffect(() => {
    try {
      if (!localStorage.getItem(storageKey)) setOpen(true);
    } catch { /* storage blocked: skip the pop-up */ }
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") close(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function close() {
    setOpen(false);
    try { localStorage.setItem(storageKey, "1"); } catch { /* ignore */ }
  }

  if (!open || areas.length === 0) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 p-0 animate-fade sm:place-items-center sm:p-4"
      onClick={close}>
      <div role="dialog" aria-modal="true" aria-labelledby="focus-title" onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-lg rounded-b-none p-6 animate-rise sm:rounded-b-[var(--radius-card)] safe-bottom">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-navy text-brand-lime"><Compass className="size-5" aria-hidden /></span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Your focus this week</p>
              <h2 id="focus-title" className="text-lg font-bold tracking-tight">Work on these {areas.length} things</h2>
            </div>
          </div>
          <button type="button" onClick={close} aria-label="Close" className="grid size-11 place-items-center rounded-lg text-fg-subtle hover:bg-surface-muted">
            <X className="size-5" />
          </button>
        </div>
        <ol className="mt-5 space-y-3">
          {areas.map((a, i) => (
            <li key={a.key} className="flex gap-3 rounded-2xl bg-surface-muted p-3">
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-primary-fg">{i + 1}</span>
              <div className="min-w-0 text-sm">
                <p className="font-semibold">{a.title}</p>
                <p className="mt-0.5 text-fg-muted">{a.why}</p>
                <p className="mt-1.5"><span className="font-medium text-success">Tip:</span> {a.tip}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 flex gap-2">
          <Link href="/growth" onClick={close} className={buttonClass("primary", "md", "flex-1")}>See tips & lessons</Link>
          <button type="button" onClick={close} className={buttonClass("outline", "md")}>Later</button>
        </div>
      </div>
    </div>
  );
}
