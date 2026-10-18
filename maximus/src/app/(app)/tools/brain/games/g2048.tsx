"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { randInt } from "@/lib/games";
import { cn } from "@/lib/utils";
import type { GameProps } from "../game-host";
import { Stat } from "./_ui";

type Board = number[][];
const empty = (): Board => Array.from({ length: 4 }, () => Array(4).fill(0));
function addTile(b: Board): Board {
  const free: [number, number][] = [];
  b.forEach((row, r) => row.forEach((v, c) => { if (!v) free.push([r, c]); }));
  if (!free.length) return b;
  const [r, c] = free[randInt(0, free.length - 1)];
  const n = b.map((x) => [...x]); n[r][c] = Math.random() < 0.9 ? 2 : 4;
  return n;
}
function slideRow(row: number[]): { row: number[]; gained: number } {
  const v = row.filter(Boolean); let gained = 0;
  for (let i = 0; i < v.length - 1; i++) if (v[i] === v[i + 1]) { v[i] *= 2; gained += v[i]; v.splice(i + 1, 1); }
  while (v.length < 4) v.push(0);
  return { row: v, gained };
}
const transpose = (b: Board) => b[0].map((_, c) => b.map((r) => r[c]));
function move(b: Board, dir: "l" | "r" | "u" | "d") {
  let g = dir === "u" || dir === "d" ? transpose(b) : b.map((r) => [...r]);
  if (dir === "r" || dir === "d") g = g.map((r) => [...r].reverse());
  let gained = 0;
  g = g.map((r) => { const s = slideRow(r); gained += s.gained; return s.row; });
  if (dir === "r" || dir === "d") g = g.map((r) => [...r].reverse());
  if (dir === "u" || dir === "d") g = transpose(g);
  return { board: g, gained, moved: JSON.stringify(g) !== JSON.stringify(b) };
}
const canMove = (b: Board) => (["l", "r", "u", "d"] as const).some((d) => move(b, d).moved);
const COLORS: Record<number, string> = { 2: "bg-slate-100 text-slate-800", 4: "bg-slate-200 text-slate-800", 8: "bg-orange-300 text-white", 16: "bg-orange-400 text-white", 32: "bg-orange-500 text-white", 64: "bg-red-500 text-white", 128: "bg-yellow-300 text-slate-900", 256: "bg-yellow-400 text-slate-900", 512: "bg-yellow-500 text-white", 1024: "bg-lime-500 text-white", 2048: "bg-green-600 text-white" };

export default function G2048({ onDone }: GameProps) {
  const [board, setBoard] = useState<Board>(() => addTile(addTile(empty())));
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const t0 = useRef(Date.now());
  const touch = useRef<[number, number] | null>(null);

  const go = useCallback((d: "l" | "r" | "u" | "d") => {
    if (over) return;
    const m = move(board, d);
    if (!m.moved) return;
    const nb = addTile(m.board);
    const s = score + m.gained;
    setBoard(nb); setScore(s);
    if (!canMove(nb)) { setOver(true); onDone({ score: s, level: `top tile ${Math.max(...nb.flat())}`, duration_ms: Date.now() - t0.current, won: Math.max(...nb.flat()) >= 2048 }); }
  }, [board, score, over, onDone]);

  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const m: Record<string, "l" | "r" | "u" | "d"> = { ArrowLeft: "l", ArrowRight: "r", ArrowUp: "u", ArrowDown: "d" };
      if (m[e.key]) { e.preventDefault(); go(m[e.key]); }
    };
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [go]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2"><Stat label="Score" value={score} /><Stat label="Top tile" value={Math.max(...board.flat())} />
        {!over && <button type="button" onClick={() => { setOver(true); onDone({ score, level: `top tile ${Math.max(...board.flat())}`, duration_ms: Date.now() - t0.current }); }} className="rounded-full bg-surface-muted px-3 py-1 text-sm">End & save</button>}
      </div>
      <div className="mx-auto grid max-w-sm touch-none grid-cols-4 gap-2 rounded-2xl bg-slate-300 p-2 dark:bg-slate-700"
        onTouchStart={(e) => { touch.current = [e.touches[0].clientX, e.touches[0].clientY]; }}
        onTouchEnd={(e) => {
          if (!touch.current) return;
          const dx = e.changedTouches[0].clientX - touch.current[0], dy = e.changedTouches[0].clientY - touch.current[1];
          touch.current = null;
          if (Math.max(Math.abs(dx), Math.abs(dy)) < 25) return;
          go(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "r" : "l") : (dy > 0 ? "d" : "u"));
        }}>
        {board.flat().map((v, i) => (
          <div key={i} className={cn("grid aspect-square place-items-center rounded-xl text-xl font-bold sm:text-2xl", v ? COLORS[v] ?? "bg-green-800 text-white" : "bg-slate-200/60 dark:bg-slate-600")}>{v || ""}</div>
        ))}
      </div>
      <p className="text-center text-sm text-fg-muted">{over ? "No more moves." : "Swipe or use the arrow keys."}</p>
      <div className="mx-auto grid w-40 grid-cols-3 gap-1 sm:hidden">
        <span /><button type="button" onClick={() => go("u")} className="h-10 rounded-xl bg-surface-muted" aria-label="Up">↑</button><span />
        <button type="button" onClick={() => go("l")} className="h-10 rounded-xl bg-surface-muted" aria-label="Left">←</button>
        <button type="button" onClick={() => go("d")} className="h-10 rounded-xl bg-surface-muted" aria-label="Down">↓</button>
        <button type="button" onClick={() => go("r")} className="h-10 rounded-xl bg-surface-muted" aria-label="Right">→</button>
      </div>
    </div>
  );
}
