"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { GameProps } from "../game-host";
import { Stat } from "./_ui";

const SIZE = 5;
const clues = (line: boolean[]) => {
  const out: number[] = []; let run = 0;
  for (const v of line) { if (v) run++; else if (run) { out.push(run); run = 0; } }
  if (run) out.push(run);
  return out.length ? out : [0];
};

function makePicture() {
  let g: boolean[][];
  do g = Array.from({ length: SIZE }, () => Array.from({ length: SIZE }, () => Math.random() < 0.55));
  while (g.flat().filter(Boolean).length < 9);
  return g;
}

export default function Nonogram({ onDone }: GameProps) {
  const [pic] = useState(makePicture);
  const [cells, setCells] = useState<(0 | 1 | 2)[][]>(() => Array.from({ length: SIZE }, () => Array(SIZE).fill(0)));
  const [mode, setMode] = useState<1 | 2>(1);
  const [t0] = useState(Date.now());
  const [done, setDone] = useState(false);
  const rows = pic.map(clues);
  const cols = Array.from({ length: SIZE }, (_, c) => clues(pic.map((r) => r[c])));

  function tap(r: number, c: number) {
    if (done) return;
    const next = cells.map((x) => [...x]) as (0 | 1 | 2)[][];
    next[r][c] = next[r][c] === mode ? 0 : mode;
    setCells(next);
    // Solved when every row and column matches the clues (any picture that fits counts).
    const filled = next.map((row) => row.map((v) => v === 1));
    const ok = filled.every((row, i) => clues(row).join() === rows[i].join())
      && Array.from({ length: SIZE }, (_, j) => clues(filled.map((row) => row[j])).join() === cols[j].join()).every(Boolean);
    if (ok) { setDone(true); const secs = (Date.now() - t0) / 1000; onDone({ score: Math.max(10, Math.round(600 - secs * 3)), duration_ms: Date.now() - t0, won: true }); }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Stat label="Grid" value="5×5" />
        <div className="flex rounded-xl bg-surface-muted p-1 text-sm">
          <button type="button" onClick={() => setMode(1)} className={cn("rounded-lg px-3 py-1", mode === 1 && "bg-surface shadow-sm")}>■ Fill</button>
          <button type="button" onClick={() => setMode(2)} className={cn("rounded-lg px-3 py-1", mode === 2 && "bg-surface shadow-sm")}>✕ Mark empty</button>
        </div>
      </div>
      <p className="text-sm text-fg-muted">Numbers show the runs of filled squares in each row and column, in order.</p>
      <div className="mx-auto grid w-fit gap-1" style={{ gridTemplateColumns: `auto repeat(${SIZE}, 2.75rem)` }}>
        <span />
        {cols.map((c, j) => <span key={j} className="flex flex-col items-center justify-end text-xs font-semibold leading-4 text-fg-muted">{c.map((n, k) => <span key={k}>{n}</span>)}</span>)}
        {cells.map((row, r) => [
          <span key={`r${r}`} className="flex items-center justify-end gap-1 pr-1 text-xs font-semibold text-fg-muted">{rows[r].join(" ")}</span>,
          ...row.map((v, c) => (
            <button key={`${r}-${c}`} type="button" onClick={() => tap(r, c)} aria-label={`Row ${r + 1} column ${c + 1}`}
              className={cn("grid size-11 place-items-center rounded-md border border-border text-fg-subtle", v === 1 ? "bg-brand-navy" : "bg-surface")}>{v === 2 ? "✕" : ""}</button>
          )),
        ])}
      </div>
    </div>
  );
}
