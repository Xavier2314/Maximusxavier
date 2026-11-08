"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, Check, Plus, Search, Send, Trash2, User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { Avatar } from "@/components/ui/misc";
import { formatMinutes, MINUTE_CHOICES } from "@/lib/checklists";
import { cn } from "@/lib/utils";
import { TalkToAi } from "@/components/form-modes";
import { arrangeChecklistAction, pushChecklistAction } from "../actions";

type Member = { id: string; full_name: string; avatar_url: string | null; member_id: string | null };
type Item = { title: string; minutes: number };

/** Title, due time, items with a time each, and who gets it: everyone or picked people. */
export function ChecklistComposer({ members }: { members: Member[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [items, setItems] = useState<Item[]>([{ title: "", minutes: 60 }]);
  const [audience, setAudience] = useState<"everyone" | "selected">("everyone");
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();

  const total = items.reduce((s, i) => s + i.minutes, 0);
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? members.filter((m) => m.full_name.toLowerCase().includes(q) || (m.member_id ?? "").toLowerCase().includes(q)) : members;
  }, [members, query]);
  const setItem = (i: number, patch: Partial<Item>) => setItems((list) => list.map((it, j) => (j === i ? { ...it, ...patch } : it)));
  const move = (i: number, d: -1 | 1) => setItems((list) => {
    const j = i + d; if (j < 0 || j >= list.length) return list;
    const next = [...list]; [next[i], next[j]] = [next[j], next[i]]; return next;
  });
  const toggle = (id: string) => setPicked((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const count = audience === "everyone" ? members.length : picked.size;

  const push = () => start(async () => {
    const r = await pushChecklistAction({ title, due: due || undefined, items: items.filter((i) => i.title.trim()), users: audience === "everyone" ? null : [...picked] });
    setNotice(r);
    if (r.ok && r.id) router.push(`/admin/checklists/${r.id}`);
  });

  const [arranged, setArranged] = useState(0);
  return (
    <div className="space-y-3">
    <div className="rounded-[22px] bg-surface p-5">
      <h2 className="mb-3 text-lg">Say it, and Maximus AI arranges it</h2>
      <TalkToAi key={arranged}
        placeholder="e.g. Meeting prep for tomorrow. Call 10 prospects, one hour. Post the flyer on WhatsApp, 30 minutes. Rehearse your story, one hour…"
        arrange={async (t) => { const r = await arrangeChecklistAction(t); return { ok: r.ok, message: r.message, data: r.checklist as unknown as Record<string, unknown> }; }}
        onArranged={(data) => {
          const c = data as unknown as { title: string | null; items: { title: string; minutes: number | null }[] };
          if (c.title) setTitle(c.title);
          // Spoken items join any already on the list; an item with no time said gets 30 minutes to start with.
          setItems((list) => [...list.filter((i) => i.title.trim()), ...c.items.map((i) => ({ title: i.title, minutes: i.minutes ?? 30 }))]);
          setNotice({ ok: true, message: "Arranged. Check the items and times below, choose who gets it, then push." });
          setArranged((n) => n + 1);
        }} />
    </div>
    <div className="grid gap-3 lg:grid-cols-[1.6fr_1fr] lg:items-start">
      <section className="space-y-4 rounded-[22px] bg-surface p-5">
        <Field label="Title" htmlFor="cl-title">
          <Input id="cl-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} placeholder="e.g. Opportunity meeting prep" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Due" htmlFor="cl-due" optional>
            <Input id="cl-due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <div>
            <p className="text-sm font-medium">Total time</p>
            <p className="mt-1.5 flex h-11 items-center gap-2 text-fg-muted"><b className="font-semibold text-fg tabular-nums">{formatMinutes(total)}</b> across {items.length} {items.length === 1 ? "item" : "items"}</p>
          </div>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Items and time</p>
          <ol className="space-y-2">
            {items.map((it, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2 rounded-2xl bg-bg p-2.5">
                <span className="grid size-6 shrink-0 place-items-center rounded-full bg-fg text-xs font-semibold text-bg tabular-nums">{i + 1}</span>
                <Input aria-label={`Item ${i + 1}`} value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} maxLength={200}
                  placeholder="e.g. Call 10 prospects and invite them" className="min-w-[12rem] flex-1" />
                <Select aria-label={`Time for item ${i + 1}`} value={it.minutes} onChange={(e) => setItem(i, { minutes: Number(e.target.value) })} className="w-32">
                  {[...new Set([...MINUTE_CHOICES, it.minutes])].sort((x, y) => x - y).map((m) => <option key={m} value={m}>{formatMinutes(m)}</option>)}
                </Select>
                <span className="flex">
                  <button type="button" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Move up" className="grid size-10 place-items-center rounded-full text-fg-subtle hover:bg-surface disabled:opacity-30"><ArrowUp className="size-4" aria-hidden /></button>
                  <button type="button" onClick={() => move(i, 1)} disabled={i === items.length - 1} aria-label="Move down" className="grid size-10 place-items-center rounded-full text-fg-subtle hover:bg-surface disabled:opacity-30"><ArrowDown className="size-4" aria-hidden /></button>
                  <button type="button" onClick={() => setItems((l) => l.filter((_, j) => j !== i))} disabled={items.length === 1} aria-label="Remove item" className="grid size-10 place-items-center rounded-full text-fg-subtle hover:bg-surface hover:text-danger disabled:opacity-30"><Trash2 className="size-4" aria-hidden /></button>
                </span>
              </li>
            ))}
          </ol>
          <button type="button" onClick={() => setItems((l) => [...l, { title: "", minutes: 30 }])} disabled={items.length >= 30}
            className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary">
            <Plus className="size-4" aria-hidden /> Add an item
          </button>
        </div>
      </section>

      <section className="flex flex-col rounded-[22px] bg-surface p-5">
        <p className="mb-2 text-sm font-medium">Send to</p>
        <div className="grid grid-cols-2 rounded-full bg-surface-muted p-1" role="radiogroup" aria-label="Send to">
          {([["everyone", "Everyone", Users], ["selected", "Pick people", User]] as const).map(([k, label, Icon]) => (
            <button key={k} type="button" role="radio" aria-checked={audience === k} onClick={() => setAudience(k)}
              className={cn("flex h-10 items-center justify-center gap-2 rounded-full text-sm font-medium", audience === k ? "bg-fg text-bg" : "text-fg")}>
              <Icon className="size-4" aria-hidden />{label}
            </button>
          ))}
        </div>
        {audience === "selected" && (
          <>
            <div className="relative mt-3">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search members" aria-label="Search members" className="pl-10" />
            </div>
            <ul className="mt-2 max-h-80 space-y-0.5 overflow-y-auto">
              {shown.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => toggle(m.id)} aria-pressed={picked.has(m.id)}
                    className="flex min-h-11 w-full items-center gap-3 rounded-xl px-2 py-1.5 text-left hover:bg-surface-muted">
                    <Avatar name={m.full_name} src={m.avatar_url} size={30} className="ring-0" />
                    <span className="min-w-0 flex-1 truncate text-sm">{m.full_name}</span>
                    <span className={cn("grid size-6 place-items-center rounded-lg border-2", picked.has(m.id) ? "border-tile-green bg-tile-green text-black" : "border-fg-subtle/40")} aria-hidden>
                      {picked.has(m.id) && <Check className="size-4" />}
                    </span>
                  </button>
                </li>
              ))}
              {!shown.length && <li className="px-2 py-3 text-sm text-fg-muted">No member matches that.</li>}
            </ul>
          </>
        )}
        <p className="mt-auto pt-4 text-sm text-fg-muted"><b className="font-semibold text-fg tabular-nums">{count}</b> {count === 1 ? "person" : "people"} will get it</p>
        <FormMessage state={notice} />
        <Button onClick={push} disabled={pending || !count} size="lg" className="mt-3 w-full">
          <Send className="size-4" aria-hidden />{pending ? "Pushing…" : audience === "everyone" ? "Push to everyone" : `Push to ${count} ${count === 1 ? "person" : "people"}`}
        </Button>
      </section>
    </div>
    </div>
  );
}
