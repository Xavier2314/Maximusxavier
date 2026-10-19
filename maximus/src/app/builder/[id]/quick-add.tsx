"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { PREBUILT } from "@/lib/funnel-templates";
import { BLOCK_GROUPS, BLOCK_LABELS, ELEMENT_GROUPS, ELEMENT_LABELS, ROW_PRESETS, type BlockType, type ElementType } from "@/lib/funnels";

export type Payload =
  | { t: "block"; type: BlockType }
  | { t: "prebuilt"; key: string }
  | { t: "saved"; id: string }
  | { t: "element"; type: ElementType }
  | { t: "row"; cols: number }
  | { t: "move"; ref: import("@/lib/funnel-doc").Ref };

type Cat = "sections" | "rows" | "elements" | "prebuilt" | "saved";
const CATS: [Cat, string][] = [["sections", "Sections"], ["rows", "Rows"], ["elements", "Elements"], ["prebuilt", "Prebuilt"], ["saved", "Saved"]];

/** GoHighLevel-style "Quick Add": categories on the left, items on the right. Click to add, or drag onto the page. */
export function QuickAdd({ onAdd, setDrag, endDrag, hint, saved = [], onDeleteSaved }: {
  onAdd: (p: Payload) => void; setDrag: (p: Payload) => void; endDrag: () => void; hint: string;
  saved?: { id: string; name: string }[]; onDeleteSaved?: (id: string) => void;
}) {
  const [cat, setCat] = useState<Cat>("sections");
  const [q, setQ] = useState("");
  const match = (s: string) => !q.trim() || s.toLowerCase().includes(q.trim().toLowerCase());

  const item = (key: string, emoji: string, label: string, hintText: string, p: Payload) => (
    <li key={key}>
      <button type="button" draggable title={hintText}
        onDragStart={(e) => { e.dataTransfer.setData("text/plain", JSON.stringify(p)); e.dataTransfer.effectAllowed = "copy"; setDrag(p); }} onDragEnd={endDrag}
        onClick={() => onAdd(p)}
        className="flex w-full cursor-grab flex-col items-start gap-1 rounded-xl border border-border bg-bg p-3 text-left hover:border-primary hover:bg-primary-soft active:cursor-grabbing">
        <span className="text-xl" aria-hidden>{emoji}</span>
        <span className="text-sm font-semibold leading-tight">{label}</span>
        <span className="line-clamp-2 text-[11px] leading-snug text-fg-subtle">{hintText}</span>
      </button>
    </li>
  );

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search blocks and elements" aria-label="Search" className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm" />
      </div>
      <div role="tablist" aria-label="Quick add categories" className="flex flex-wrap gap-1">
        {CATS.map(([k, l]) => <button key={k} role="tab" aria-selected={cat === k && !q} type="button" onClick={() => { setCat(k); setQ(""); }} className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold ${cat === k && !q ? "bg-primary-soft text-primary" : "text-fg-muted hover:bg-surface-muted"}`}>{l}</button>)}
      </div>
      <p className="text-xs text-fg-subtle">{hint}</p>

      {(q || cat === "rows") && (
        <div>
          {!q && <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Rows</p>}
          <ul className="grid grid-cols-3 gap-2">
            {ROW_PRESETS.filter((n) => match(`${n} column row`)).map((n) => (
              <li key={n}>
                <button type="button" draggable onDragStart={(e) => { const p: Payload = { t: "row", cols: n }; e.dataTransfer.setData("text/plain", JSON.stringify(p)); e.dataTransfer.effectAllowed = "copy"; setDrag(p); }} onDragEnd={endDrag}
                  onClick={() => onAdd({ t: "row", cols: n })} aria-label={`${n} column row`}
                  className="flex w-full cursor-grab flex-col items-center gap-2 rounded-xl border border-border bg-bg p-2.5 hover:border-primary hover:bg-primary-soft active:cursor-grabbing">
                  <span className="grid h-6 w-full gap-1" style={{ gridTemplateColumns: `repeat(${n}, 1fr)` }} aria-hidden>{Array.from({ length: n }, (_, i) => <span key={i} className="rounded-sm bg-primary/30" />)}</span>
                  <span className="text-[11px] font-semibold">{n} {n === 1 ? "column" : "columns"}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {(q || cat === "elements") && ELEMENT_GROUPS.map((g) => {
        const types = g.types.filter((t) => match(ELEMENT_LABELS[t].label));
        return types.length ? (
          <div key={g.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{g.title}</p>
            <ul className="grid grid-cols-2 gap-2">{types.map((t) => item(t, ELEMENT_LABELS[t].emoji, ELEMENT_LABELS[t].label, "Goes inside a column", { t: "element", type: t }))}</ul>
          </div>
        ) : null;
      })}

      {(q || cat === "sections") && BLOCK_GROUPS.map((g) => {
        const types = g.types.filter((t) => match(BLOCK_LABELS[t].label));
        return types.length ? (
          <div key={g.title}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">{g.title}</p>
            <ul className="grid grid-cols-2 gap-2">{types.map((t) => item(t, BLOCK_LABELS[t].emoji, BLOCK_LABELS[t].label, BLOCK_LABELS[t].hint, { t: "block", type: t }))}</ul>
          </div>
        ) : null;
      })}

      {(q || cat === "saved") && (() => {
        const list = saved.filter((x) => match(x.name));
        if (!list.length) return q ? null : <p className="rounded-xl bg-surface-muted p-3 text-xs text-fg-muted">Nothing saved yet. Select a section on the page and press &ldquo;Save as template&rdquo; to keep it here for every funnel you build.</p>;
        return (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Your saved sections</p>
            <ul className="grid grid-cols-2 gap-2">
              {list.map((x) => (
                <li key={x.id} className="relative">
                  {item(`sv-${x.id}`, "⭐", x.name, "Your own section", { t: "saved", id: x.id })}
                  {onDeleteSaved && <button type="button" aria-label={`Delete ${x.name}`} onClick={() => { if (confirm(`Delete the saved section “${x.name}”? Funnels that already use it are not changed.`)) onDeleteSaved(x.id); }} className="absolute right-1.5 top-1.5 rounded-md px-1.5 text-xs text-fg-subtle hover:bg-danger/10 hover:text-danger">✕</button>}
                </li>
              ))}
            </ul>
          </div>
        );
      })()}

      {(q || cat === "prebuilt") && (() => {
        const list = PREBUILT.filter((p) => match(p.label));
        return list.length ? (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Prebuilt sections</p>
            <p className="mb-2 text-xs text-fg-subtle">Filled in with your product details. Change anything.</p>
            <ul className="grid grid-cols-2 gap-2">{list.map((p) => item(`pre-${p.key}`, p.emoji, p.label, p.hint, { t: "prebuilt", key: p.key }))}</ul>
          </div>
        ) : null;
      })()}
    </div>
  );
}
