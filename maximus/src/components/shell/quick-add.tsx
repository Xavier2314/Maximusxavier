"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { QUICK_ACTIONS } from "./nav";
import { NAV_ICONS } from "./nav-icons";

/** "+ New" menu for the most common actions. */
export function QuickAdd() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", esc); };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" aria-label="New"
        className="inline-flex h-11 items-center gap-1.5 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-fg hover:bg-primary-hover">
        <Plus className="size-4" aria-hidden /><span className="hidden sm:inline">New</span>
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 top-12 z-50 w-60 p-1.5 shadow-lg animate-rise">
          {QUICK_ACTIONS.map((a) => {
            const Icon = NAV_ICONS[a.icon];
            return (
              <Link key={a.href} href={a.href} role="menuitem" onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm hover:bg-surface-muted">
                <span className="grid size-8 place-items-center rounded-lg bg-primary-soft text-primary"><Icon className="size-4" aria-hidden /></span>
                {a.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
