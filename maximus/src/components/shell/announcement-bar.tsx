"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Megaphone, X } from "lucide-react";

export type BarAnnouncement = { id: string; title: string; kind: string };

const KEY = "maximus-dismissed-announcements";
const read = (): string[] => { try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; } };

/** Rotating strip of the latest announcements; each can be dismissed. */
export function AnnouncementBar({ items }: { items: BarAnnouncement[] }) {
  const [hidden, setHidden] = useState<string[] | null>(null);
  const [i, setI] = useState(0);
  useEffect(() => setHidden(read()), []);
  const visible = hidden ? items.filter((a) => !hidden.includes(a.id)) : [];
  useEffect(() => {
    if (visible.length < 2) return;
    const t = setInterval(() => setI((n) => (n + 1) % visible.length), 7000);
    return () => clearInterval(t);
  }, [visible.length]);
  if (visible.length === 0) return null;
  const a = visible[i % visible.length];
  const dismiss = () => {
    const next = [...(hidden ?? []), a.id].slice(-50);
    try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { /* ignore */ }
    setHidden(next); setI(0);
  };
  return (
    <div className="bg-gradient-to-r from-[#991b1b] via-[#dc2626] to-[#b91c1c] text-white" role="region" aria-label="Announcements">
      <div className="mx-auto flex h-10 max-w-7xl items-center gap-2 px-4 text-sm sm:px-6">
        <Megaphone className="size-4 shrink-0 animate-pulse text-[#fde047]" aria-hidden />
        <span className="hidden shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide sm:inline">
          {a.kind === "recognition" ? "Recognition" : a.kind === "training" ? "Training" : "Announcement"}
        </span>
        {/* Each announcement slides in, holds, then slides out before the next one. */}
        <span className="relative min-w-0 flex-1 overflow-hidden">
          <Link href={`/announcements#a-${a.id}`} key={`${a.id}-${i}`}
            className="block truncate font-semibold hover:underline [animation:ann-slide_7s_ease-in-out_infinite]">
            {a.title}
          </Link>
        </span>
        {visible.length > 1 && (
          <span className="flex items-center">
            <button type="button" onClick={() => setI((n) => (n - 1 + visible.length) % visible.length)} aria-label="Previous announcement" className="grid size-7 place-items-center rounded-lg hover:bg-white/10"><ChevronLeft className="size-4" /></button>
            <span className="w-8 text-center text-xs text-white/60 tabular-nums">{(i % visible.length) + 1}/{visible.length}</span>
            <button type="button" onClick={() => setI((n) => (n + 1) % visible.length)} aria-label="Next announcement" className="grid size-7 place-items-center rounded-lg hover:bg-white/10"><ChevronRight className="size-4" /></button>
          </span>
        )}
        <button type="button" onClick={dismiss} aria-label="Dismiss announcement" className="grid size-7 place-items-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white"><X className="size-4" /></button>
      </div>
    </div>
  );
}
