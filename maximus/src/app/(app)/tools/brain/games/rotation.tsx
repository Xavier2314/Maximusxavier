"use client";

import { useState } from "react";
import { randInt, shuffle } from "@/lib/games";
import type { GameProps } from "../game-host";
import { Choice, Stat } from "./_ui";

type Shape = [number, number][];
const rotate = (s: Shape): Shape => s.map(([x, y]) => [-y, x]);
const mirror = (s: Shape): Shape => s.map(([x, y]) => [-x, y]);
const norm = (s: Shape): Shape => {
  const mx = Math.min(...s.map((p) => p[0])), my = Math.min(...s.map((p) => p[1]));
  return s.map(([x, y]) => [x - mx, y - my] as [number, number]).sort((a, b) => a[0] - b[0] || a[1] - b[1]);
};
const key = (s: Shape) => JSON.stringify(norm(s));

function randomShape(n: number): Shape {
  const s: Shape = [[0, 0]];
  while (s.length < n) {
    const [x, y] = s[randInt(0, s.length - 1)];
    const d = [[1, 0], [-1, 0], [0, 1], [0, -1]][randInt(0, 3)];
    const p: [number, number] = [x + d[0], y + d[1]];
    if (!s.some((q) => q[0] === p[0] && q[1] === p[1])) s.push(p);
  }
  return s;
}

function make(round: number) {
  let base: Shape, m: Shape;
  do { base = randomShape(5 + Math.min(2, Math.floor(round / 3))); m = mirror(base); }
  while ([0, 1, 2, 3].some((k) => { let r = m; for (let i = 0; i < k; i++) r = rotate(r); return key(r) === key(base); }));
  const rot = (s: Shape, k: number) => { let r = s; for (let i = 0; i < k; i++) r = rotate(r); return r; };
  const right = rot(base, randInt(1, 3));
  const wrongs = [rot(m, randInt(0, 3)), rot(m, randInt(0, 3)), rot(mirror(rotate(base)), randInt(0, 3))];
  return { base, options: shuffle([{ s: right, ok: true }, ...wrongs.map((s) => ({ s, ok: false }))]) };
}

function Draw({ s }: { s: Shape }) {
  const n = norm(s);
  const w = Math.max(...n.map((p) => p[0])) + 1, h = Math.max(...n.map((p) => p[1])) + 1;
  return (
    <svg viewBox={`0 0 ${Math.max(w, h)} ${Math.max(w, h)}`} className="mx-auto size-20" aria-hidden>
      {n.map(([x, y], i) => <rect key={i} x={x + 0.05} y={y + 0.05} width={0.9} height={0.9} rx={0.15} fill="var(--primary)" />)}
    </svg>
  );
}

const ROUNDS = 10;

export default function Rotation({ onDone }: GameProps) {
  const [round, setRound] = useState(1);
  const [p, setP] = useState(() => make(1));
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [t0] = useState(Date.now());
  function pick(i: number) {
    if (picked !== null) return;
    setPicked(i);
    const s = score + (p.options[i].ok ? 1 : 0);
    setScore(s);
    setTimeout(() => {
      if (round === ROUNDS) { onDone({ score: s, duration_ms: Date.now() - t0 }); return; }
      setRound(round + 1); setP(make(round + 1)); setPicked(null);
    }, 900);
  }
  return (
    <div className="mx-auto max-w-md space-y-4 text-center">
      <div className="flex justify-center gap-2"><Stat label="Round" value={`${round}/${ROUNDS}`} /><Stat label="Score" value={score} /></div>
      <p className="text-sm text-fg-muted">Which one is this shape <b>rotated</b> (not flipped)?</p>
      <div className="rounded-2xl bg-surface-muted p-3"><Draw s={p.base} /></div>
      <div className="grid grid-cols-2 gap-3">
        {p.options.map((o, i) => (
          <Choice key={i} onClick={() => pick(i)} disabled={picked !== null} state={picked === null ? null : o.ok ? "right" : i === picked ? "wrong" : null}><Draw s={o.s} /></Choice>
        ))}
      </div>
    </div>
  );
}
