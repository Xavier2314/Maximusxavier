"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, Play, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { addDays } from "@/lib/planner";
import { BLOCK_CATEGORIES } from "@/lib/tools";
import { cn, formatDate } from "@/lib/utils";
import { deleteBlockAction, saveBlockAction } from "../actions";

export type Block = { id: string; block_date: string; start_min: number; end_min: number; title: string; category: string; done: boolean };

const START_HOUR = 5, END_HOUR = 23, PX_PER_MIN = 1.1, SNAP = 15;
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
const fromTime = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + (m || 0); };
const label = (m: number) => new Date(Date.UTC(2000, 0, 1, Math.floor(m / 60), m % 60)).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit", timeZone: "UTC" });

export function BlockPlanner({ date, today, blocks: initial }: { date: string; today: string; blocks: Block[] }) {
  const router = useRouter();
  const [blocks, setBlocks] = useState(initial);
  useEffect(() => setBlocks(initial), [initial]);
  const [title, setTitle] = useState("");
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("10:00");
  const [category, setCategory] = useState("work");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, run] = useTransition();
  const drag = useRef<{ id: string; type: "move" | "resize"; y: number; s: number; e: number } | null>(null);
  const [dragView, setDragView] = useState<{ id: string; s: number; e: number } | null>(null);

  const total = (END_HOUR - START_HOUR) * 60;
  const planned = blocks.reduce((a, b) => a + (b.end_min - b.start_min), 0);

  function persist(b: Block) {
    run(async () => {
      const r = await saveBlockAction({ id: b.id, block_date: b.block_date, start_min: b.start_min, end_min: b.end_min, title: b.title, category: b.category as "work", done: b.done });
      if (!r.ok) { setMsg(r.message); router.refresh(); }
    });
  }

  function add(e: React.FormEvent) {
    e.preventDefault();
    const s = fromTime(start), en = fromTime(end);
    if (!title.trim() || en <= s) { setMsg("Give the block a name and an end time after its start."); return; }
    run(async () => {
      const r = await saveBlockAction({ block_date: date, start_min: s, end_min: en, title: title.trim(), category: category as "work" });
      setMsg(r.ok ? null : r.message);
      if (r.ok) { setTitle(""); setStart(toTime(en)); setEnd(toTime(Math.min(1440, en + 60))); router.refresh(); }
    });
  }

  function onPointerDown(e: React.PointerEvent, b: Block, type: "move" | "resize") {
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { id: b.id, type, y: e.clientY, s: b.start_min, e: b.end_min };
    setDragView({ id: b.id, s: b.start_min, e: b.end_min });
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const delta = Math.round((e.clientY - d.y) / PX_PER_MIN / SNAP) * SNAP;
    if (d.type === "move") {
      const len = d.e - d.s;
      const s = Math.max(START_HOUR * 60, Math.min(END_HOUR * 60 - len, d.s + delta));
      setDragView({ id: d.id, s, e: s + len });
    } else {
      setDragView({ id: d.id, s: d.s, e: Math.max(d.s + SNAP, Math.min(END_HOUR * 60, d.e + delta)) });
    }
  }
  function onPointerUp() {
    const d = drag.current, v = dragView;
    drag.current = null;
    setDragView(null);
    if (!d || !v || (v.s === d.s && v.e === d.e)) return;
    const b = blocks.find((x) => x.id === d.id);
    if (!b) return;
    const next = { ...b, start_min: v.s, end_min: v.e };
    setBlocks((all) => all.map((x) => (x.id === b.id ? next : x)));
    persist(next);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <CardBody>
          <div className="mb-4 flex items-center justify-between gap-2">
            <Link href={`/tools/time-blocks?date=${addDays(date, -1)}`} className="rounded-xl p-2 hover:bg-surface-muted" aria-label="Previous day"><ChevronLeft className="size-5" aria-hidden /></Link>
            <div className="text-center">
              <p className="font-semibold">{formatDate(date, { weekday: "long", day: "numeric", month: "long" })}</p>
              <p className="text-xs text-fg-muted">{Math.round(planned / 6) / 10}h planned{date !== today && <> · <Link href="/tools/time-blocks" className="text-primary">Today</Link></>}</p>
            </div>
            <Link href={`/tools/time-blocks?date=${addDays(date, 1)}`} className="rounded-xl p-2 hover:bg-surface-muted" aria-label="Next day"><ChevronRight className="size-5" aria-hidden /></Link>
          </div>
          <div className="relative select-none" style={{ height: total * PX_PER_MIN }} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}>
            {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => (
              <div key={i} className="absolute inset-x-0 flex items-start border-t border-border/60" style={{ top: i * 60 * PX_PER_MIN }}>
                <span className="-mt-2.5 w-14 bg-surface pr-2 text-right text-[11px] text-fg-subtle">{label((START_HOUR + i) * 60)}</span>
              </div>
            ))}
            {blocks.map((b) => {
              const v = dragView?.id === b.id ? dragView : { s: b.start_min, e: b.end_min };
              const color = BLOCK_CATEGORIES.find((c) => c.key === b.category)?.color ?? "#305ee6";
              const top = (Math.max(v.s, START_HOUR * 60) - START_HOUR * 60) * PX_PER_MIN;
              const height = Math.max(22, (Math.min(v.e, END_HOUR * 60) - Math.max(v.s, START_HOUR * 60)) * PX_PER_MIN);
              return (
                <div key={b.id} className={cn("absolute left-16 right-1 touch-none overflow-hidden rounded-xl px-2.5 py-1 text-white shadow-sm", b.done && "opacity-60", dragView?.id === b.id && "z-10 ring-2 ring-white")}
                  style={{ top, height, background: color, cursor: "grab" }} onPointerDown={(e) => onPointerDown(e, b, "move")}>
                  <div className="flex items-start justify-between gap-1">
                    <div className="min-w-0">
                      <p className={cn("truncate text-sm font-semibold", b.done && "line-through")}>{b.title}</p>
                      {height > 36 && <p className="text-[11px] opacity-90">{label(v.s)} – {label(v.e)}</p>}
                    </div>
                    <div className="flex shrink-0 gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
                      <Link href={`/tools/pomodoro?label=${encodeURIComponent(b.title)}`} className="rounded p-1 hover:bg-white/20" aria-label={`Focus on ${b.title}`}><Play className="size-3.5" aria-hidden /></Link>
                      <button type="button" className="rounded p-1 hover:bg-white/20" aria-label={b.done ? "Mark not done" : "Mark done"}
                        onClick={() => { const next = { ...b, done: !b.done }; setBlocks((all) => all.map((x) => (x.id === b.id ? next : x))); persist(next); }}>
                        <Check className="size-3.5" aria-hidden />
                      </button>
                      <button type="button" className="rounded p-1 hover:bg-white/20" aria-label={`Delete ${b.title}`}
                        onClick={() => { setBlocks((all) => all.filter((x) => x.id !== b.id)); run(async () => { await deleteBlockAction(b.id); }); }}>
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </div>
                  <div className="absolute inset-x-0 bottom-0 h-2 cursor-ns-resize" onPointerDown={(e) => onPointerDown(e, b, "resize")} aria-hidden />
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>
      <div className="space-y-6">
        <Card>
          <CardBody>
            <form onSubmit={add} className="space-y-3">
              <p className="font-semibold">Add a block</p>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="e.g. Prospecting calls" aria-label="Block name" />
              <div className="grid grid-cols-2 gap-2">
                <Input type="time" value={start} onChange={(e) => setStart(e.target.value)} step={900} aria-label="Start" />
                <Input type="time" value={end} onChange={(e) => setEnd(e.target.value)} step={900} aria-label="End" />
              </div>
              <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
                {BLOCK_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
              </Select>
              <Button type="submit" className="w-full" disabled={pending}><Plus className="size-4" aria-hidden /> Add block</Button>
              {msg && <p className="text-sm text-danger" role="alert">{msg}</p>}
            </form>
          </CardBody>
        </Card>
        <Card>
          <CardBody className="space-y-2 text-sm">
            <p className="font-semibold">Categories</p>
            {BLOCK_CATEGORIES.map((c) => {
              const mins = blocks.filter((b) => b.category === c.key).reduce((a, b) => a + b.end_min - b.start_min, 0);
              return (
                <p key={c.key} className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="size-3 rounded" style={{ background: c.color }} aria-hidden />{c.label}</span>
                  <span className="tabular-nums text-fg-muted">{mins ? `${Math.round(mins / 6) / 10}h` : "—"}</span>
                </p>
              );
            })}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
