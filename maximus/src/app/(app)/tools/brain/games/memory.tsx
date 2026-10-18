"use client";

import { useEffect, useState } from "react";
import { shuffle } from "@/lib/games";
import { cn } from "@/lib/utils";
import type { GameProps } from "../game-host";
import { Stat } from "./_ui";

const ICONS = ["🚀", "💰", "🎯", "📈", "🤝", "💡", "🏆", "📚", "⏰", "🌱", "🔥", "💎"];

export default function Memory({ onDone }: GameProps) {
  const [size, setSize] = useState<6 | 8 | 12 | null>(null);
  const [cards, setCards] = useState<string[]>([]);
  const [open, setOpen] = useState<number[]>([]);
  const [found, setFound] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [t0, setT0] = useState(0);

  function start(n: 6 | 8 | 12) { setSize(n); setCards(shuffle([...ICONS.slice(0, n), ...ICONS.slice(0, n)])); setT0(Date.now()); }
  useEffect(() => {
    if (open.length !== 2) return;
    const [a, b] = open;
    const t = setTimeout(() => {
      if (cards[a] === cards[b]) {
        const f = new Set(found).add(cards[a]);
        setFound(f);
        if (size && f.size === size) {
          const secs = (Date.now() - t0) / 1000;
          onDone({ score: Math.max(10, Math.round(size * 100 - (moves + 1 - size) * 15 - secs * 2)), level: `${size} pairs`, duration_ms: Date.now() - t0, won: true });
        }
      }
      setOpen([]);
    }, cards[a] === cards[b] ? 250 : 700);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!size) return (
    <div className="py-6 text-center">
      <p className="mb-4 font-semibold">Choose a size</p>
      <div className="flex justify-center gap-2">{([6, 8, 12] as const).map((n) => <button key={n} type="button" onClick={() => start(n)} className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-fg">{n} pairs</button>)}</div>
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><Stat label="Moves" value={moves} /><Stat label="Pairs" value={`${found.size}/${size}`} /></div>
      <div className={cn("mx-auto grid max-w-md gap-2", size === 12 ? "grid-cols-6" : "grid-cols-4")}>
        {cards.map((c, i) => {
          const up = open.includes(i) || found.has(c);
          return (
            <button key={i} type="button" aria-label={up ? c : "Hidden card"} disabled={up || open.length === 2}
              onClick={() => { setOpen((o) => [...o, i]); if (open.length === 1) setMoves((m) => m + 1); }}
              className={cn("grid aspect-square place-items-center rounded-xl text-2xl transition-colors", up ? "bg-primary-soft" : "bg-brand-navy hover:opacity-90", found.has(c) && "opacity-60")}>
              {up ? c : ""}
            </button>
          );
        })}
      </div>
    </div>
  );
}
