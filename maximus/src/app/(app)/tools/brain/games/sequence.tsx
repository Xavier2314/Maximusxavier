"use client";

import { useState } from "react";
import { randInt, shuffle } from "@/lib/games";
import type { GameProps } from "../game-host";
import { Choice, Stat } from "./_ui";

function make(level: number) {
  const kind = randInt(0, Math.min(4, 1 + Math.floor(level / 2)));
  const a = randInt(1, 9), d = randInt(2, 4 + level), n = 5;
  let seq: number[];
  if (kind === 0) seq = Array.from({ length: n + 1 }, (_, i) => a + i * d);
  else if (kind === 1) seq = Array.from({ length: n + 1 }, (_, i) => a * 2 ** i);
  else if (kind === 2) { seq = [a, a + 1]; while (seq.length < n + 1) seq.push(seq[seq.length - 1] + seq[seq.length - 2]); }
  else if (kind === 3) seq = Array.from({ length: n + 1 }, (_, i) => (i + a) * (i + a));
  else { const d2 = randInt(1, 3); seq = [a]; for (let i = 1; i <= n; i++) seq.push(seq[i - 1] + d + d2 * (i - 1)); }
  const ans = seq[n];
  const opts = new Set([ans]);
  while (opts.size < 4) opts.add(ans + randInt(-6, 6) * (randInt(0, 1) ? 1 : 2) || ans + opts.size);
  return { shown: seq.slice(0, n), ans, opts: shuffle([...opts]) };
}

const ROUNDS = 10;

export default function Sequence({ onDone }: GameProps) {
  const [round, setRound] = useState(1);
  const [score, setScore] = useState(0);
  const [p, setP] = useState(() => make(1));
  const [picked, setPicked] = useState<number | null>(null);
  const [start] = useState(Date.now());
  function pick(o: number) {
    if (picked !== null) return;
    setPicked(o);
    const s = score + (o === p.ans ? 1 : 0);
    setScore(s);
    setTimeout(() => {
      if (round === ROUNDS) { onDone({ score: s, duration_ms: Date.now() - start }); return; }
      setRound(round + 1); setP(make(round + 1)); setPicked(null);
    }, 800);
  }
  return (
    <div className="mx-auto max-w-md space-y-5 py-2 text-center">
      <div className="flex justify-center gap-2"><Stat label="Round" value={`${round}/${ROUNDS}`} /><Stat label="Score" value={score} /></div>
      <p className="text-3xl font-bold tabular-nums tracking-wide">{p.shown.join(", ")}, ?</p>
      <div className="grid grid-cols-2 gap-3">
        {p.opts.map((o) => <Choice key={o} onClick={() => pick(o)} disabled={picked !== null}
          state={picked === null ? null : o === p.ans ? "right" : o === picked ? "wrong" : null}><span className="block text-center text-xl">{o}</span></Choice>)}
      </div>
    </div>
  );
}
