"use client";

import { useState } from "react";
import { randInt, shuffle } from "@/lib/games";
import { cn } from "@/lib/utils";
import type { GameProps } from "../game-host";
import { Stat } from "./_ui";

const POOL = ["🍎", "🍌", "🍇", "🍓", "🥑", "🌽", "🥕", "🍋", "🍉", "🥥", "🍒", "🫐"];
const SIZE = 6, DIFFS = 5;

function make() {
  const a = Array.from({ length: SIZE * SIZE }, () => POOL[randInt(0, POOL.length - 1)]);
  const b = [...a];
  const spots = shuffle(Array.from({ length: SIZE * SIZE }, (_, i) => i)).slice(0, DIFFS);
  for (const s of spots) { let x = a[s]; while (x === a[s]) x = POOL[randInt(0, POOL.length - 1)]; b[s] = x; }
  return { a, b, spots: new Set(spots) };
}

export default function Difference({ onDone }: GameProps) {
  const [g] = useState(make);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [misses, setMisses] = useState(0);
  const [t0] = useState(Date.now());
  function tap(i: number) {
    if (found.has(i)) return;
    if (!g.spots.has(i)) { setMisses(misses + 1); return; }
    const f = new Set(found).add(i);
    setFound(f);
    if (f.size === DIFFS) {
      const secs = (Date.now() - t0) / 1000;
      onDone({ score: Math.max(10, Math.round(1000 - secs * 8 - misses * 40)), duration_ms: Date.now() - t0, won: true });
    }
  }
  const grid = (cells: string[], label: string) => (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${SIZE}, minmax(0, 1fr))` }} aria-label={label}>
      {cells.map((c, i) => (
        <button key={i} type="button" onClick={() => tap(i)} className={cn("grid aspect-square place-items-center rounded-md bg-surface-muted text-xl", found.has(i) && "ring-2 ring-success")}>{c}</button>
      ))}
    </div>
  );
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><Stat label="Found" value={`${found.size}/${DIFFS}`} /><Stat label="Misses" value={misses} /></div>
      <p className="text-sm text-fg-muted">Tap the tiles in either grid that are different.</p>
      <div className="grid gap-4 sm:grid-cols-2">{grid(g.a, "Grid A")}{grid(g.b, "Grid B")}</div>
    </div>
  );
}
