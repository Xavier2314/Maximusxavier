"use client";

import { useState } from "react";
import { randInt, shuffle } from "@/lib/games";
import { cn } from "@/lib/utils";
import type { GameProps } from "../game-host";
import { Stat } from "./_ui";

const POOL = ["GOAL", "TEAM", "SALES", "FOCUS", "HABIT", "SAVE", "LEAD", "GROW", "PLAN", "VISION", "PROFIT", "CLIENT", "MENTOR", "SKILL", "BRAND", "ORDER"];
const N = 10, COUNT = 6;
const DIRS = [[0, 1], [1, 0], [1, 1], [-1, 1]];

function build() {
  const g: string[][] = Array.from({ length: N }, () => Array(N).fill(""));
  const placed: { word: string; cells: string[] }[] = [];
  for (const w of shuffle(POOL)) {
    if (placed.length >= COUNT) break;
    for (let tries = 0; tries < 80; tries++) {
      const [dr, dc] = DIRS[randInt(0, DIRS.length - 1)];
      const r = randInt(0, N - 1), c = randInt(0, N - 1);
      const cells = [...w].map((_, i) => [r + dr * i, c + dc * i]);
      if (cells.some(([x, y], i) => x < 0 || y < 0 || x >= N || y >= N || (g[x][y] && g[x][y] !== w[i]))) continue;
      cells.forEach(([x, y], i) => { g[x][y] = w[i]; });
      placed.push({ word: w, cells: cells.map(([x, y]) => `${x},${y}`) });
      break;
    }
  }
  const A = "ABCDEFGHIJKLMNOPRSTUVWY";
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) if (!g[r][c]) g[r][c] = A[randInt(0, A.length - 1)];
  return { g, placed };
}

export default function WordSearch({ onDone }: GameProps) {
  const [{ g, placed }] = useState(build);
  const [start, setStart] = useState<[number, number] | null>(null);
  const [found, setFound] = useState<string[]>([]);
  const [t0] = useState(Date.now());
  const foundCells = new Set(placed.filter((p) => found.includes(p.word)).flatMap((p) => p.cells));

  function tap(r: number, c: number) {
    if (!start) { setStart([r, c]); return; }
    const [r0, c0] = start;
    setStart(null);
    const dr = Math.sign(r - r0), dc = Math.sign(c - c0), len = Math.max(Math.abs(r - r0), Math.abs(c - c0)) + 1;
    if (!(r - r0 === 0 || c - c0 === 0 || Math.abs(r - r0) === Math.abs(c - c0))) return;
    const cells = Array.from({ length: len }, (_, i) => `${r0 + dr * i},${c0 + dc * i}`);
    const hit = placed.find((p) => !found.includes(p.word) && (p.cells.join() === cells.join() || p.cells.join() === [...cells].reverse().join()));
    if (hit) {
      const f = [...found, hit.word];
      setFound(f);
      if (f.length === placed.length) {
        const secs = (Date.now() - t0) / 1000;
        onDone({ score: Math.max(10, Math.round(placed.length * 150 - secs * 2)), duration_ms: Date.now() - t0, won: true });
      }
    }
  }
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2"><Stat label="Found" value={`${found.length}/${placed.length}`} /></div>
      <p className="text-sm text-fg-muted">Tap the first letter of a word, then its last letter. Words go across, down or diagonally.</p>
      <div className="flex flex-wrap gap-1.5">{placed.map((p) => <span key={p.word} className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", found.includes(p.word) ? "bg-success-soft text-success line-through" : "bg-surface-muted")}>{p.word}</span>)}</div>
      <div className="mx-auto grid max-w-md gap-0.5" style={{ gridTemplateColumns: `repeat(${N}, minmax(0, 1fr))` }}>
        {g.flatMap((row, r) => row.map((ch, c) => (
          <button key={`${r}-${c}`} type="button" onClick={() => tap(r, c)}
            className={cn("grid aspect-square place-items-center rounded font-mono text-sm font-semibold sm:text-base",
              foundCells.has(`${r},${c}`) ? "bg-success-soft text-success" : start && start[0] === r && start[1] === c ? "bg-primary text-primary-fg" : "bg-surface-muted")}>
            {ch}
          </button>
        )))}
      </div>
    </div>
  );
}
