"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Minus, Plus, RotateCcw } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { FOCUS, type FocusKey } from "@/lib/growth";
import type { TeamMemberStat } from "@/lib/types";
import { cn } from "@/lib/utils";

type ChartNode = {
  id: string; name: string; code: string; avatar: string | null; active: boolean; joinedAt: string | null;
  focus: FocusKey[]; children: ChartNode[];
};

const NEW_DAYS = 7;

function build(rootId: string, members: TeamMemberStat[], focus: Record<string, FocusKey[]>): ChartNode[] {
  const nodes = new Map<string, ChartNode>(members.map((m) => [m.member, {
    id: m.member, name: m.full_name, code: m.member_code, avatar: m.avatar_url, active: m.is_active,
    joinedAt: m.joined_at, focus: focus[m.member] ?? [], children: [],
  }]));
  const roots: ChartNode[] = [];
  for (const m of members) {
    const n = nodes.get(m.member)!;
    const parent = m.sponsor_id && m.sponsor_id !== rootId ? nodes.get(m.sponsor_id) : undefined;
    if (parent) parent.children.push(n); else roots.push(n);
  }
  const byJoin = (a: ChartNode, b: ChartNode) => (a.joinedAt ?? "").localeCompare(b.joinedAt ?? "");
  for (const n of nodes.values()) n.children.sort(byJoin);
  return roots.sort(byJoin);
}

/** Avatar wrapped in a ring that fills as the member brings in their target. */
function RecruitRing({ count, target, children }: { count: number; target: number; children: ReactNode }) {
  const size = 68, stroke = 4, r = (size - stroke) / 2, c = 2 * Math.PI * r;
  const pct = Math.min(count / target, 1);
  return (
    <span className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke} />
        {pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
            stroke={pct >= 1 ? "var(--brand-green)" : "var(--brand-blue)"} strokeDasharray={`${c * pct} ${c}`} />
        )}
      </svg>
      {children}
    </span>
  );
}

function NodeCard({ node, target, isRoot = false }: { node: ChartNode; target: number; isRoot?: boolean }) {
  const count = node.children.length;
  const isNew = !isRoot && node.joinedAt && Date.now() - new Date(node.joinedAt).getTime() < NEW_DAYS * 86400_000;
  const top = node.focus[0];
  const body = (
    <>
      {isNew && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-brand-lime px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-navy">New</span>}
      <RecruitRing count={count} target={target}>
        <span className="relative">
          <Avatar name={node.name} src={node.avatar} size={56} />
          {!isRoot && <span className={cn("absolute bottom-0 right-0 size-3.5 rounded-full ring-2 ring-surface", node.active ? "bg-brand-green" : "bg-fg-subtle")}
            title={node.active ? "Active" : "Inactive"} />}
        </span>
      </RecruitRing>
      <span className={cn("mt-2 block max-w-full truncate text-sm font-semibold", isRoot ? "text-white" : "group-hover:text-primary")}>
        {node.name}{isRoot && <span className="font-normal text-white/60"> (you)</span>}
      </span>
      <span className={cn("block text-[11px]", isRoot ? "text-white/60" : "text-fg-subtle")}>{node.code}</span>
      <span className={cn("mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
        count >= target ? "bg-success-soft text-success" : isRoot ? "bg-white/10 text-white" : "bg-primary-soft text-primary")}>
        {count >= target ? `${count} brought in ✓` : `${count}/${target} brought in`}
      </span>
      {top && FOCUS[top] && (
        <span className="mt-1 block max-w-full truncate rounded-full bg-warning-soft px-2 py-0.5 text-[11px] font-medium text-warning" title={`Needs work: ${FOCUS[top].title}`}>
          Focus: {FOCUS[top].short}
        </span>
      )}
    </>
  );
  const cls = cn("group relative flex w-[150px] flex-col items-center rounded-2xl border px-2 pb-3 pt-3 text-center transition-all",
    isRoot ? "border-transparent bg-gradient-to-b from-brand-navy to-[#1e3a8a] text-white"
      : "border-border bg-surface hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-card)]",
    isNew && "ring-2 ring-brand-lime");
  return isRoot ? <div className={cls}>{body}</div> : <Link href={`/team/${node.id}`} className={cls}>{body}</Link>;
}

function Branch({ node, target, level }: { node: ChartNode; target: number; level: number }) {
  const [open, setOpen] = useState(level < 3);
  return (
    <li>
      <NodeCard node={node} target={target} />
      {node.children.length > 0 && (
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
          aria-label={`${open ? "Hide" : "Show"} ${node.name}'s team`}
          className="relative z-10 -mt-2 rounded-full border border-border bg-surface px-2 py-0.5 text-[11px] font-semibold text-fg-muted hover:text-primary">
          {open ? "−" : `+${node.children.length}`}
        </button>
      )}
      {open && node.children.length > 0 && (
        <ul>{node.children.map((c) => <Branch key={c.id} node={c} target={target} level={level + 1} />)}</ul>
      )}
    </li>
  );
}

export function OrgChart({ rootId, rootName, rootCode, rootAvatar, members, focus, target }: {
  rootId: string; rootName: string; rootCode: string; rootAvatar: string | null;
  members: TeamMemberStat[]; focus: Record<string, FocusKey[]>; target: number;
}) {
  const tree = useMemo(() => build(rootId, members, focus), [rootId, members, focus]);
  const root: ChartNode = { id: rootId, name: rootName, code: rootCode, avatar: rootAvatar, active: true, joinedAt: null, focus: focus[rootId] ?? [], children: tree };
  const [zoom, setZoom] = useState(1);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
  }, [zoom, members.length]);

  return (
    <div className="relative">
      <div className="absolute right-3 top-3 z-20 flex gap-1 rounded-xl bg-surface p-1 shadow-[var(--shadow-card)] ring-1 ring-border">
        <button type="button" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))} aria-label="Zoom out" className="grid size-8 place-items-center rounded-lg hover:bg-surface-muted"><Minus className="size-4" /></button>
        <button type="button" onClick={() => setZoom(1)} aria-label="Reset zoom" className="grid size-8 place-items-center rounded-lg hover:bg-surface-muted"><RotateCcw className="size-4" /></button>
        <button type="button" onClick={() => setZoom((z) => Math.min(1.6, +(z + 0.15).toFixed(2)))} aria-label="Zoom in" className="grid size-8 place-items-center rounded-lg hover:bg-surface-muted"><Plus className="size-4" /></button>
      </div>
      <div ref={scroller} className="max-h-[75vh] overflow-auto px-4 pb-8 pt-14">
        <div className="org-tree mx-auto w-max min-w-full" style={{ zoom }}>
          <ul>
            <li>
              <NodeCard node={root} target={target} isRoot />
              {tree.length > 0 && <ul>{tree.map((n) => <Branch key={n.id} node={n} target={target} level={1} />)}</ul>}
            </li>
          </ul>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border px-4 py-3 text-xs text-fg-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-brand-blue" aria-hidden /> Ring fills toward their first {target} (no limit after that)</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-brand-green" aria-hidden /> First {target} reached</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-brand-lime" aria-hidden /> Joined in the last {NEW_DAYS} days</span>
        <span className="flex items-center gap-1.5"><span className="rounded-full bg-warning-soft px-1.5 text-warning">Focus</span> What they should work on next</span>
      </div>
    </div>
  );
}
