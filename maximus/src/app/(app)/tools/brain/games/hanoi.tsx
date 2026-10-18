"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { GameProps } from "../game-host";
import { Stat } from "./_ui";

const COLORS = ["#305ee6", "#7c3aed", "#0e7490", "#4f9a10", "#b45309", "#db2777", "#64748b"];

export default function Hanoi({ onDone }: GameProps) {
  const [n, setN] = useState<number | null>(null);
  const [pegs, setPegs] = useState<number[][]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [moves, setMoves] = useState(0);
  const [t0, setT0] = useState(0);
  const [won, setWon] = useState(false);

  function start(k: number) { setN(k); setPegs([Array.from({ length: k }, (_, i) => k - i), [], []]); setMoves(0); setT0(Date.now()); setWon(false); }
  function tap(p: number) {
    if (won || !n) return;
    if (sel === null) { if (pegs[p].length) setSel(p); return; }
    if (sel === p) { setSel(null); return; }
    const from = pegs[sel], to = pegs[p];
    const disk = from[from.length - 1];
    if (to.length && to[to.length - 1] < disk) { setSel(null); return; }
    const next = pegs.map((x) => [...x]);
    next[sel].pop(); next[p].push(disk);
    setPegs(next); setSel(null);
    const m = moves + 1; setMoves(m);
    if (next[2].length === n) {
      setWon(true);
      const min = 2 ** n - 1;
      onDone({ score: Math.max(10, Math.round(n * 200 * (min / m))), level: `${n} disks, ${m} moves (best ${min})`, duration_ms: Date.now() - t0, won: true });
    }
  }
  if (!n) return (
    <div className="py-6 text-center">
      <p className="mb-2 font-semibold">Move the whole tower to the right peg.</p>
      <p className="mb-4 text-sm text-fg-muted">Move one disk at a time. Never put a bigger disk on a smaller one.</p>
      <div className="flex justify-center gap-2">{[3, 4, 5, 6].map((k) => <button key={k} type="button" onClick={() => start(k)} className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-fg">{k} disks</button>)}</div>
    </div>
  );
  return (
    <div className="space-y-4">
      <div className="flex gap-2"><Stat label="Moves" value={moves} /><Stat label="Best possible" value={2 ** n - 1} /></div>
      <div className="grid grid-cols-3 gap-2">
        {pegs.map((peg, p) => (
          <button key={p} type="button" onClick={() => tap(p)} aria-label={`Peg ${p + 1}`}
            className={cn("relative flex h-56 flex-col-reverse items-center rounded-2xl bg-surface-muted p-2", sel === p && "ring-2 ring-primary")}>
            <span className="absolute bottom-2 top-4 w-1.5 rounded-full bg-border" aria-hidden />
            {peg.map((d, k) => (
              <span key={k} className={cn("relative z-10 mb-1 h-6 rounded-md", sel === p && k === peg.length - 1 && "-translate-y-2")}
                style={{ width: `${20 + (d / n) * 75}%`, background: COLORS[(d - 1) % COLORS.length] }} />
            ))}
          </button>
        ))}
      </div>
    </div>
  );
}
