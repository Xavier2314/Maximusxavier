"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { CornerDownLeft, Search, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { QUICK_ACTIONS, type NavSection } from "./nav";
import { NAV_ICONS } from "./nav-icons";

type Item = { href: string; label: string; icon: string; group: string; keywords?: string };

/** Ctrl/⌘ + K: jump to any page or action by typing. */
export function CommandPalette({ sections }: { sections: NavSection[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const items = useMemo<Item[]>(() => [
    ...QUICK_ACTIONS.map((a) => ({ ...a, group: "Actions" })),
    ...sections.flatMap((s) => s.items.map((i) => ({ ...i, group: s.title ?? "Pages" }))),
    { href: "/settings", label: "Settings", icon: "sliders", group: "Account" },
    { href: "/profile", label: "My profile", icon: "users", group: "Account" },
    { href: "/notifications", label: "Notifications", icon: "bell", group: "Account" },
  ], [sections]);
  const results = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((i) => `${i.label} ${i.keywords ?? ""} ${i.group}`.toLowerCase().includes(t));
  }, [items, q]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("maximus:search", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("maximus:search", onOpen); };
  }, []);
  useEffect(() => { if (open) { setQ(""); setActive(0); setTimeout(() => inputRef.current?.focus(), 10); } }, [open]);
  useEffect(() => setActive(0), [q]);

  if (!open) return null;
  const go = (href: string) => { setOpen(false); router.push(href); };
  let lastGroup = "";
  return (
    <div className="fixed inset-0 z-[60] grid place-items-start bg-black/50 px-4 pt-[12vh] backdrop-blur-sm animate-fade" onClick={() => setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Search" onClick={(e) => e.stopPropagation()} className="card mx-auto w-full max-w-lg overflow-hidden animate-rise">
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="size-5 text-fg-subtle" aria-hidden />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search pages and actions…" aria-label="Search"
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
              if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
              if (e.key === "Enter" && results[active]) go(results[active].href);
              if (e.key === "Escape") setOpen(false);
            }}
            className="h-14 flex-1 bg-transparent text-[15px] focus:outline-none" />
          <kbd className="rounded-md border border-border px-1.5 py-0.5 text-[11px] text-fg-subtle">Esc</kbd>
        </div>
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {results.length === 0 && <li className="px-3 py-8 text-center text-sm text-fg-muted">No matches. Try “prospect”, “order” or “goals”.</li>}
          {results.map((r, idx) => {
            const Icon = NAV_ICONS[r.icon] ?? Zap;
            const header = r.group !== lastGroup ? (lastGroup = r.group) : null;
            return (
              <li key={`${r.group}-${r.href}-${r.label}`} role="option" aria-selected={idx === active}>
                {header && <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">{header}</p>}
                <button type="button" onMouseEnter={() => setActive(idx)} onClick={() => go(r.href)}
                  className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm", idx === active ? "bg-primary text-primary-fg" : "hover:bg-surface-muted")}>
                  <Icon className="size-4 shrink-0" aria-hidden />
                  <span className="flex-1">{r.label}</span>
                  {idx === active && <CornerDownLeft className="size-4 opacity-70" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
