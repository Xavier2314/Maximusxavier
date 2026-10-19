"use client";

import { ChevronDown, ChevronRight, Eye, EyeOff, Lock, LockOpen } from "lucide-react";
import { useState } from "react";
import { sameRef, type Device, type Ref } from "@/lib/funnel-doc";
import { BLOCK_LABELS, ELEMENT_LABELS, type FunnelBlock } from "@/lib/funnels";

const summary = (b: FunnelBlock): string => {
  const r = b as unknown as Record<string, unknown>;
  const t = (r.headline ?? r.title ?? r.name ?? r.text ?? r.body ?? "") as string;
  return typeof t === "string" ? t.slice(0, 28) : "";
};

/** The page as a tree: Section > Row > Column > Element. Click to select, eye to hide on the current device, lock to protect. */
export function LayersPanel({ blocks, sel, device, onSelect, onToggleHidden, onToggleLock }: {
  blocks: FunnelBlock[]; sel: Ref | null; device: Device; onSelect: (r: Ref) => void; onToggleHidden: (r: Ref) => void; onToggleLock: (blockId: string) => void;
}) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const toggle = (id: string) => setOpen((o) => ({ ...o, [id]: !o[id] }));
  const hiddenOn = (resp: FunnelBlock["resp"]) => device !== "desktop" && Boolean(resp?.[device]?.hidden) || (device === "mobile" && Boolean(resp?.tablet?.hidden) && resp?.mobile?.hidden === undefined);
  const row = (key: string, depth: number, label: string, ref: Ref, opts: { expandable?: boolean; id?: string; hidden?: boolean; locked?: boolean; lockable?: boolean; hideable?: boolean }) => {
    const on = sameRef(sel, ref);
    return (
      <li key={key}>
        <div className={`flex items-center gap-1 rounded-lg py-1 pr-1 text-sm ${on ? "bg-primary-soft text-primary" : "hover:bg-surface-muted"}`} style={{ paddingLeft: 4 + depth * 14 }}>
          {opts.expandable ? <button type="button" aria-label="Expand or collapse" aria-expanded={open[opts.id!] ?? true} onClick={() => toggle(opts.id!)} className="grid size-6 place-items-center">{(open[opts.id!] ?? true) ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}</button> : <span className="size-6" />}
          <button type="button" onClick={() => onSelect(ref)} className={`min-w-0 flex-1 truncate text-left ${opts.hidden ? "opacity-50" : ""}`}>{label}</button>
          {opts.hideable && device !== "desktop" && <button type="button" aria-label={opts.hidden ? "Show on this device" : "Hide on this device"} onClick={() => onToggleHidden(ref)} className="grid size-6 place-items-center text-fg-subtle hover:text-fg">{opts.hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button>}
          {opts.lockable && <button type="button" aria-label={opts.locked ? "Unlock" : "Lock"} aria-pressed={opts.locked} onClick={() => onToggleLock(ref.block)} className="grid size-6 place-items-center text-fg-subtle hover:text-fg">{opts.locked ? <Lock className="size-4" /> : <LockOpen className="size-4" />}</button>}
        </div>
      </li>
    );
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-fg-subtle">{device === "desktop" ? "Switch to Tablet or Phone to hide things on smaller screens." : `The eye hides an item on ${device === "tablet" ? "tablets and phones" : "phones"} only.`}</p>
      <ul className="space-y-0.5">
        {blocks.map((b) => {
          const out = [row(b.id, 0, `${BLOCK_LABELS[b.type].emoji} ${b.name || BLOCK_LABELS[b.type].label}${summary(b) && b.type !== "section" ? ` · ${summary(b)}` : ""}`, { block: b.id }, { expandable: b.type === "section", id: b.id, hidden: hiddenOn(b.resp), locked: b.locked, lockable: true, hideable: true })];
          if (b.type === "section" && (open[b.id] ?? true)) {
            b.rows.forEach((r) => {
              out.push(row(r.id, 1, `${r.columns.length} column row`, { block: b.id, row: r.id }, { expandable: true, id: r.id }));
              if (open[r.id] ?? true) r.columns.forEach((c, ci) => {
                out.push(row(c.id, 2, `Column ${ci + 1}`, { block: b.id, row: r.id, col: c.id }, { expandable: true, id: c.id }));
                if (open[c.id] ?? true) c.elements.forEach((e) => out.push(row(e.id, 3, `${ELEMENT_LABELS[e.type].emoji} ${ELEMENT_LABELS[e.type].label}`, { block: b.id, row: r.id, col: c.id, el: e.id }, { hidden: hiddenOn(e.resp), hideable: true })));
              });
            });
          }
          return out;
        })}
      </ul>
    </div>
  );
}
