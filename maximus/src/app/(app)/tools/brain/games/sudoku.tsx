"use client";

import { useState } from "react";
import { shuffle } from "@/lib/games";
import { cn } from "@/lib/utils";
import type { GameProps } from "../game-host";
import { Stat } from "./_ui";

function solve(g: number[]): boolean {
  const i = g.indexOf(0);
  if (i < 0) return true;
  const r = Math.floor(i / 9), c = i % 9;
  for (const n of shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])) {
    if (ok(g, r, c, n)) { g[i] = n; if (solve(g)) return true; g[i] = 0; }
  }
  return false;
}
function ok(g: number[], r: number, c: number, n: number) {
  for (let k = 0; k < 9; k++) if (g[r * 9 + k] === n || g[k * 9 + c] === n) return false;
  const br = r - (r % 3), bc = c - (c % 3);
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) if (g[(br + a) * 9 + bc + b] === n) return false;
  return true;
}
function make(holes: number) {
  const sol = Array(81).fill(0); solve(sol);
  const puzzle = [...sol];
  for (const i of shuffle(Array.from({ length: 81 }, (_, k) => k)).slice(0, holes)) puzzle[i] = 0;
  return { sol, puzzle };
}
const LEVELS = { Easy: 36, Medium: 46, Hard: 54 } as const;

export default function Sudoku({ onDone }: GameProps) {
  const [level, setLevel] = useState<keyof typeof LEVELS | null>(null);
  const [game, setGame] = useState<{ sol: number[]; puzzle: number[] } | null>(null);
  const [cells, setCells] = useState<number[]>([]);
  const [sel, setSel] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [t0, setT0] = useState(0);
  const [done, setDone] = useState(false);

  function start(l: keyof typeof LEVELS) { const g = make(LEVELS[l]); setLevel(l); setGame(g); setCells([...g.puzzle]); setT0(Date.now()); }
  function enter(n: number) {
    if (sel === null || !game || done || game.puzzle[sel]) return;
    const next = [...cells]; next[sel] = n; setCells(next);
    if (n && n !== game.sol[sel]) setMistakes((m) => m + 1);
    if (next.every((v, i) => v === game.sol[i])) {
      setDone(true);
      const mins = (Date.now() - t0) / 60000;
      onDone({ score: Math.max(10, Math.round(LEVELS[level!] * 30 - mins * 20 - mistakes * 25)), level: level!, duration_ms: Date.now() - t0, won: true });
    }
  }
  if (!game) return (
    <div className="py-6 text-center"><p className="mb-4 font-semibold">Choose a level</p>
      <div className="flex justify-center gap-2">{(Object.keys(LEVELS) as (keyof typeof LEVELS)[]).map((l) => <button key={l} type="button" onClick={() => start(l)} className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-fg">{l}</button>)}</div>
    </div>
  );
  const sr = sel !== null ? Math.floor(sel / 9) : -1, sc = sel !== null ? sel % 9 : -1;
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><Stat label="Level" value={level} /><Stat label="Mistakes" value={mistakes} /></div>
      <div className="mx-auto grid max-w-md grid-cols-9 overflow-hidden rounded-xl border-2 border-fg">
        {cells.map((v, i) => {
          const r = Math.floor(i / 9), c = i % 9, given = game.puzzle[i] !== 0, wrong = v && v !== game.sol[i];
          return (
            <button key={i} type="button" onClick={() => setSel(i)} aria-label={`Row ${r + 1} column ${c + 1}${v ? `, ${v}` : ""}`}
              className={cn("grid aspect-square place-items-center text-base sm:text-lg",
                c % 3 === 2 && c < 8 && "border-r-2 border-r-fg", c % 3 !== 2 && "border-r border-r-border",
                r % 3 === 2 && r < 8 && "border-b-2 border-b-fg", r % 3 !== 2 && "border-b border-b-border",
                sel === i ? "bg-primary/30" : (r === sr || c === sc) ? "bg-primary-soft/60" : "bg-surface",
                given ? "font-bold" : wrong ? "text-danger" : "text-primary")}>
              {v || ""}
            </button>
          );
        })}
      </div>
      <div className="mx-auto grid max-w-md grid-cols-5 gap-1.5 sm:grid-cols-10">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <button key={n} type="button" onClick={() => enter(n)} className="h-11 rounded-xl bg-surface-muted text-lg font-semibold">{n}</button>)}
        <button type="button" onClick={() => enter(0)} className="h-11 rounded-xl bg-surface-muted text-sm">Clear</button>
      </div>
    </div>
  );
}
