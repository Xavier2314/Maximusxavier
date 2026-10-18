"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ChevronRight, List, Network, Search, Workflow } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Avatar, Badge } from "@/components/ui/misc";
import type { FocusKey } from "@/lib/growth";
import type { TeamMemberStat } from "@/lib/types";
import { cn, formatMoney, formatRelative } from "@/lib/utils";
import { OrgChart } from "./org-chart";

type Node = TeamMemberStat & { children: Node[] };

function buildTree(rootId: string, members: TeamMemberStat[]): Node[] {
  const byParent = new Map<string, Node[]>();
  const nodes = members.map((m) => ({ ...m, children: [] as Node[] }));
  for (const n of nodes) {
    const parent = n.sponsor_id ?? rootId;
    if (!byParent.has(parent)) byParent.set(parent, []);
    byParent.get(parent)!.push(n);
  }
  for (const n of nodes) n.children = byParent.get(n.member) ?? [];
  // Members whose sponsor is outside the viewer's visible branch attach to the root.
  const visible = new Set(nodes.map((n) => n.member));
  return nodes.filter((n) => n.sponsor_id === rootId || !n.sponsor_id || !visible.has(n.sponsor_id));
}

function countAll(n: Node): number {
  return n.children.reduce((a, c) => a + 1 + countAll(c), 0);
}

function TreeNode({ node, level }: { node: Node; level: number }) {
  const [open, setOpen] = useState(level < 2);
  const size = countAll(node);
  return (
    <li className="relative">
      <div className="relative flex items-center gap-2 py-1.5">
        {node.children.length > 0 ? (
          <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open}
            aria-label={`${open ? "Collapse" : "Expand"} ${node.full_name}'s team`}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-fg-subtle hover:bg-surface-muted">
            <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} aria-hidden />
          </button>
        ) : <span className="size-7 shrink-0" aria-hidden />}
        <Link href={`/team/${node.member}`}
          className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-border bg-surface px-3 py-2.5 transition-all hover:-translate-y-px hover:border-primary/40 hover:shadow-[var(--shadow-card)]">
          <span className="relative">
            <Avatar name={node.full_name} src={node.avatar_url} size={38} />
            <span className={cn("absolute -bottom-0.5 -right-0.5 size-3 rounded-full ring-2 ring-surface", node.is_active ? "bg-brand-green" : "bg-fg-subtle")}
              aria-label={node.is_active ? "Active" : "Inactive"} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold group-hover:text-primary">{node.full_name}</span>
            <span className="block truncate text-xs text-fg-subtle">
              {node.member_code}{node.office_name ? ` · ${node.office_name}` : ""}
            </span>
          </span>
          <span className="hidden items-center gap-2 sm:flex">
            {size > 0 && <Badge tone="blue">{size} in team</Badge>}
            <Badge tone="neutral">{node.attendance_days}d attended</Badge>
          </span>
        </Link>
      </div>
      {open && node.children.length > 0 && (
        <ul className="ml-[13px] border-l-2 border-dashed border-border pl-4">
          {node.children.map((c) => <TreeNode key={c.member} node={c} level={level + 1} />)}
        </ul>
      )}
    </li>
  );
}

const VIEWS = [
  { key: "chart", label: "Chart view", icon: Workflow },
  { key: "tree", label: "Tree view", icon: Network },
  { key: "list", label: "List view", icon: List },
] as const;

export function TeamExplorer({ rootId, rootName, rootCode, rootAvatar, rootRank = null, members, focus, target }: {
  rootId: string; rootName: string; rootCode: string; rootAvatar: string | null; rootRank?: string | null; members: TeamMemberStat[];
  focus: Record<string, FocusKey[]>; target: number;
}) {
  const [view, setView] = useState<(typeof VIEWS)[number]["key"]>("chart");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");
  const [level, setLevel] = useState("all");
  const tree = useMemo(() => buildTree(rootId, members), [rootId, members]);
  const maxDepth = Math.max(1, ...members.map((m) => m.depth));

  const filtered = members.filter((m) =>
    (!query || `${m.full_name} ${m.member_code} ${m.office_name ?? ""}`.toLowerCase().includes(query.toLowerCase()))
    && (status === "all" || (status === "active") === m.is_active)
    && (level === "all" || m.depth === Number(level)));
  const filtering = Boolean(query) || status !== "all" || level !== "all";

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, ID or office" className="pl-9" aria-label="Search team" />
        </div>
        <div className="flex gap-2">
          <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Filter by status" className="w-auto">
            <option value="all">All members</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
          <Select value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Filter by level" className="w-auto">
            <option value="all">All levels</option>
            {Array.from({ length: maxDepth }, (_, i) => <option key={i} value={i + 1}>Level {i + 1}</option>)}
          </Select>
          <div className="flex rounded-xl bg-surface-muted p-1" role="group" aria-label="View">
            {VIEWS.map((v) => (
              <button key={v.key} type="button" onClick={() => setView(v.key)} aria-pressed={view === v.key}
                className={cn("grid size-9 place-items-center rounded-lg", view === v.key ? "bg-surface text-primary shadow-sm" : "text-fg-subtle")}
                aria-label={v.label} title={v.label}>
                <v.icon className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "chart" && !filtering ? (
        <OrgChart rootId={rootId} rootName={rootName} rootCode={rootCode} rootAvatar={rootAvatar} rootRank={rootRank} members={members} focus={focus} target={target} />
      ) : view === "tree" && !filtering ? (
        <div className="overflow-x-auto p-4">
          <div className="mb-2 flex items-center gap-3 rounded-2xl bg-gradient-to-r from-brand-navy to-[#1e3a8a] px-3 py-2.5 text-white">
            <Avatar name={rootName} src={rootAvatar} size={38} className="ring-white/20" />
            <div>
              <p className="text-sm font-semibold">{rootName} <span className="font-normal text-white/60">(you)</span></p>
              <p className="text-xs text-white/60">{members.length} people in your visible network</p>
            </div>
          </div>
          <ul className="ml-[13px] min-w-[320px] border-l-2 border-dashed border-border pl-4">
            {tree.map((n) => <TreeNode key={n.member} node={n} level={1} />)}
          </ul>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-fg-subtle">
              <tr className="border-b border-border">
                <th scope="col" className="px-4 py-3 font-medium">Member</th>
                <th scope="col" className="px-4 py-3 font-medium">Level</th>
                <th scope="col" className="px-4 py-3 font-medium">Attendance</th>
                <th scope="col" className="px-4 py-3 font-medium">Prospects</th>
                <th scope="col" className="px-4 py-3 font-medium">Sales</th>
                <th scope="col" className="px-4 py-3 font-medium">Last active</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.member} className="border-b border-border/60 last:border-0 hover:bg-surface-muted/60">
                  <td className="px-4 py-3">
                    <Link href={`/team/${m.member}`} className="flex items-center gap-3">
                      <Avatar name={m.full_name} src={m.avatar_url} size={32} />
                      <span>
                        <span className="block font-medium">{m.full_name}</span>
                        <span className="text-xs text-fg-subtle">{m.member_code}</span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3">{m.depth}</td>
                  <td className="px-4 py-3 tabular-nums">{m.attendance_days} days</td>
                  <td className="px-4 py-3 tabular-nums">{m.prospects}</td>
                  <td className="px-4 py-3 tabular-nums">{formatMoney(m.sales)}</td>
                  <td className="px-4 py-3">
                    {m.is_active ? <Badge tone="green">Active</Badge> : <Badge>{m.last_activity ? formatRelative(m.last_activity) : "Never"}</Badge>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-fg-muted">No members match these filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
