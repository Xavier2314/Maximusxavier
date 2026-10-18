"use client";

import { useCallback, useEffect, useState } from "react";
import { shuffle } from "@/lib/games";
import type { GameProps } from "../game-host";
import { Stat } from "./_ui";

type Cell = { n: boolean; s: boolean; e: boolean; w: boolean };

function generate(size: number): Cell[][] {
  const g: Cell[][] = Array.from({ length: size }, () => Array.from({ length: size }, () => ({ n: true, s: true, e: true, w: true })));
  const seen = Array.from({ length: size }, () => Array(size).fill(false));
  const stack: [number, number][] = [[0, 0]];
  seen[0][0] = true;
  while (stack.length) {
    const [r, c] = stack[stack.length - 1];
    const opts = shuffle([[r - 1, c, "n", "s"], [r + 1, c, "s", "n"], [r, c + 1, "e", "w"], [r, c - 1, "w", "e"]] as [number, number, keyof Cell, keyof Cell][])
      .filter(([nr, nc]) => nr >= 0 && nc >= 0 && nr < size && nc < size && !seen[nr][nc]);
    if (!opts.length) { stack.pop(); continue; }
    const [nr, nc, a, b] = opts[0];
    g[r][c][a] = false; g[nr][nc][b] = false; seen[nr][nc] = true;
    stack.push([nr, nc]);
  }
  return g;
}

export default function Maze({ onDone }: GameProps) {
  const [size, setSize] = useState<number | null>(null);
  const [maze, setMaze] = useState<Cell[][]>([]);
  const [pos, setPos] = useState<[number, number]>([0, 0]);
  const [steps, setSteps] = useState(0);
  const [t0, setT0] = useState(0);
  const [done, setDone] = useState(false);

  const move = useCallback((d: "n" | "s" | "e" | "w") => {
    if (done || !size) return;
    const [r, c] = pos;
    if (maze[r][c][d]) return;
    const np: [number, number] = d === "n" ? [r - 1, c] : d === "s" ? [r + 1, c] : d === "e" ? [r, c + 1] : [r, c - 1];
    setPos(np); setSteps((s) => s + 1);
    if (np[0] === size - 1 && np[1] === size - 1) {
      setDone(true);
      const secs = (Date.now() - t0) / 1000;
      onDone({ score: Math.max(10, Math.round(size * 60 - secs * 3)), level: `${size}×${size}`, duration_ms: Date.now() - t0, won: true });
    }
  }, [done, size, pos, maze, t0, onDone]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const m: Record<string, "n" | "s" | "e" | "w"> = { ArrowUp: "n", ArrowDown: "s", ArrowLeft: "w", ArrowRight: "e" };
      if (m[e.key]) { e.preventDefault(); move(m[e.key]); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [move]);

  if (!size) return (
    <div className="py-6 text-center">
      <p className="mb-4 font-semibold">Get from the top-left to the 🏁</p>
      <div className="flex justify-center gap-2">{[8, 12, 16].map((k) => <button key={k} type="button" onClick={() => { setSize(k); setMaze(generate(k)); setT0(Date.now()); }} className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-fg">{k}×{k}</button>)}</div>
    </div>
  );
  const B = "2px solid var(--fg)";
  return (
    <div className="space-y-3">
      <Stat label="Steps" value={steps} />
      <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}>
        {maze.flatMap((row, r) => row.map((cell, c) => (
          <div key={`${r}-${c}`} className="grid aspect-square place-items-center text-xs"
            style={{ borderTop: cell.n ? B : undefined, borderBottom: cell.s ? B : undefined, borderLeft: cell.w ? B : undefined, borderRight: cell.e ? B : undefined }}>
            {pos[0] === r && pos[1] === c ? "🟢" : r === size - 1 && c === size - 1 ? "🏁" : ""}
          </div>
        )))}
      </div>
      <div className="mx-auto grid w-40 grid-cols-3 gap-1">
        <span /><button type="button" onClick={() => move("n")} className="h-11 rounded-xl bg-surface-muted" aria-label="Up">↑</button><span />
        <button type="button" onClick={() => move("w")} className="h-11 rounded-xl bg-surface-muted" aria-label="Left">←</button>
        <button type="button" onClick={() => move("s")} className="h-11 rounded-xl bg-surface-muted" aria-label="Down">↓</button>
        <button type="button" onClick={() => move("e")} className="h-11 rounded-xl bg-surface-muted" aria-label="Right">→</button>
      </div>
    </div>
  );
}
