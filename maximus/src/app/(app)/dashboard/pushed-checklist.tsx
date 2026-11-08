"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Pause, Play, RotateCcw } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { formatClock, formatMinutes, isRunning, workedSeconds, type ChecklistItem, type ItemProgress } from "@/lib/checklists";
import { cn } from "@/lib/utils";
import { checklistTimerAction } from "../admin/checklists/actions";

export type HomeChecklist = {
  id: string; title: string; due_at: string | null; dueLabel: string | null;
  from: { name: string; avatar: string | null }; items: ChecklistItem[]; progress: ItemProgress[];
};

/**
 * A checklist pushed by an admin: each item has its own time. Start runs a countdown (only one at
 * a time), pause and resume keep the clock honest, and the timer keeps counting into overtime.
 */
export function PushedChecklist({ list, renderedAt }: { list: HomeChecklist; renderedAt: number }) {
  const router = useRouter();
  // Start from the server's clock so the first render matches, then tick with the device clock.
  const [now, setNow] = useState(renderedAt);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const mine = (id: string) => list.progress.find((p) => p.item_id === id);
  const anyRunning = list.items.some((i) => isRunning(mine(i.id)));

  useEffect(() => {
    setNow(Date.now());
    if (!anyRunning) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [anyRunning]);

  // A gentle nudge when the running item's time is up (once per item, while the page is open).
  const running = list.items.find((i) => isRunning(mine(i.id)));
  const runningLeft = running ? running.minutes * 60 - workedSeconds(mine(running.id), now) : 1;
  useEffect(() => {
    if (!running || runningLeft > 0) return;
    const key = `mx-checklist-up-${running.id}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, "1"); } catch { /* private mode */ }
    if ("vibrate" in navigator) navigator.vibrate?.([200, 100, 200]);
  }, [running, runningLeft]);

  const act = (id: string, op: Parameters<typeof checklistTimerAction>[1]) => start(async () => {
    setError(null);
    const r = await checklistTimerAction(id, op);
    if (!r.ok) setError(r.message);
    router.refresh();
  });

  const done = list.items.filter((i) => mine(i.id)?.completed_at).length;
  const totalLeft = list.items.filter((i) => !mine(i.id)?.completed_at)
    .reduce((s, i) => s + Math.max(0, i.minutes * 60 - workedSeconds(mine(i.id), now)), 0);

  return (
    <section aria-label={list.title} className="rounded-[26px] bg-black p-4 text-white sm:p-5 dark:ring-1 dark:ring-border">
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2 text-sm text-white/70">
          <Avatar name={list.from.name} src={list.from.avatar} size={22} className="ring-0" />
          <span className="truncate">From {list.from.name.split(" ")[0]}</span>
        </span>
        {list.dueLabel && <span className="shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-black">Due {list.dueLabel}</span>}
      </div>
      <h2 className="mt-2.5 text-[26px] leading-tight tracking-[-0.02em]">{list.title}</h2>
      <div className="mt-1.5 flex justify-between text-sm text-white/75 tabular-nums">
        <span>{done} of {list.items.length} done</span>
        <span>{done === list.items.length ? "All done" : `${formatMinutes(Math.ceil(totalLeft / 60))} left`}</span>
      </div>
      <div className="mt-2 h-1.5 rounded-full bg-white/20"><div className="h-1.5 rounded-full bg-tile-green" style={{ width: `${(done / list.items.length) * 100}%` }} /></div>
      {error && <p className="mt-2 text-sm text-red-300" role="alert">{error}</p>}

      <ol className="mt-3 space-y-1.5">
        {list.items.map((item) => {
          const p = mine(item.id);
          const finished = Boolean(p?.completed_at);
          const live = isRunning(p);
          const paused = Boolean(p?.started_at && p.paused_at && !finished);
          const left = item.minutes * 60 - workedSeconds(p, now);
          if (live || paused) {
            return (
              <li key={item.id} className={cn("rounded-2xl p-3", live ? "bg-brand-blue" : "bg-white/10")}>
                <p className="text-[15px] leading-snug">{item.title}</p>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="font-display text-[30px] leading-none tracking-[-0.02em] tabular-nums" aria-live="off">
                    {formatClock(left)}
                    <span className="ml-1.5 font-sans text-xs tracking-normal text-white/70">{left < 0 ? "over time" : paused ? "paused" : `left of ${formatMinutes(item.minutes)}`}</span>
                  </span>
                  <span className="flex shrink-0 gap-2">
                    <button type="button" disabled={pending} onClick={() => act(item.id, live ? "pause" : "resume")} aria-label={live ? "Pause" : "Resume"}
                      className="grid size-11 place-items-center rounded-full bg-white text-black">{live ? <Pause className="size-4" aria-hidden /> : <Play className="size-4" aria-hidden />}</button>
                    <button type="button" disabled={pending} onClick={() => act(item.id, "done")} aria-label="Mark done"
                      className="grid size-11 place-items-center rounded-full bg-tile-green text-black"><Check className="size-5" aria-hidden /></button>
                  </span>
                </div>
                <div className="mt-2.5 h-1 rounded-full bg-white/25">
                  <div className={cn("h-1 rounded-full", left < 0 ? "bg-red-300" : "bg-white")} style={{ width: `${Math.min(100, (workedSeconds(p, now) / (item.minutes * 60)) * 100)}%` }} />
                </div>
              </li>
            );
          }
          return (
            <li key={item.id} className="flex items-center gap-3 rounded-2xl bg-white/[0.07] py-2.5 pl-3 pr-2">
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border-2", finished ? "border-tile-green bg-tile-green text-black" : "border-white/35")} aria-hidden>
                {finished && <Check className="size-4" />}
              </span>
              <span className={cn("min-w-0 flex-1 text-[15px] leading-snug", finished && "text-white/50 line-through")}>{item.title}</span>
              <span className="shrink-0 text-xs text-white/60">{formatMinutes(item.minutes)}</span>
              {finished ? (
                <button type="button" disabled={pending} onClick={() => act(item.id, "undo")} aria-label="Mark not done"
                  className="grid size-10 shrink-0 place-items-center rounded-full text-white/60 hover:bg-white/10"><RotateCcw className="size-4" aria-hidden /></button>
              ) : (
                <button type="button" disabled={pending} onClick={() => act(item.id, "start")} aria-label={`Start ${item.title}`}
                  className="grid size-10 shrink-0 place-items-center rounded-full bg-tile-green text-black"><Play className="size-4" aria-hidden /></button>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
