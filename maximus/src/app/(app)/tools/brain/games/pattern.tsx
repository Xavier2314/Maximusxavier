"use client";

import { useState } from "react";
import { randInt } from "@/lib/games";
import type { GameProps } from "../game-host";
import { StartScreen, Stat, useCountdown } from "./_ui";

const PAIRS = [["😀", "😃"], ["🔵", "🟦"], ["🍎", "🍅"], ["🐶", "🐱"], ["⭐", "🌟"], ["🌑", "🌚"], ["🟢", "🟩"], ["🔺", "🔻"], ["🌲", "🌳"], ["🙂", "🙃"], ["🍊", "🍑"], ["🌕", "🌝"]];

function make(round: number) {
  const n = Math.min(8, 3 + Math.floor(round / 2));
  const [a, b] = PAIRS[randInt(0, PAIRS.length - 1)];
  return { n, a, b, odd: randInt(0, n * n - 1) };
}

export default function Pattern({ onDone }: GameProps) {
  const [running, setRunning] = useState(false);
  const [round, setRound] = useState(0);
  const [p, setP] = useState(() => make(0));
  const [misses, setMisses] = useState(0);
  const [over, setOver] = useState(false);
  const left = useCountdown(60, running, () => { setOver(true); setRunning(false); onDone({ score: round, level: `${misses} misses`, duration_ms: 60000 }); });
  if (!running && !over) return <StartScreen title="Spot the odd one out" onStart={() => setRunning(true)}>60 seconds. The grid gets bigger as you go.</StartScreen>;
  if (over) return <p className="py-8 text-center">Time! {round} rounds.</p>;
  return (
    <div className="space-y-3">
      <div className="flex gap-2"><Stat label="Time" value={`${left}s`} /><Stat label="Rounds" value={round} /><Stat label="Misses" value={misses} /></div>
      <div className="mx-auto grid max-w-md gap-1" style={{ gridTemplateColumns: `repeat(${p.n}, minmax(0, 1fr))` }}>
        {Array.from({ length: p.n * p.n }, (_, i) => (
          <button key={i} type="button" onClick={() => { if (i === p.odd) { setRound(round + 1); setP(make(round + 1)); } else setMisses(misses + 1); }}
            className="grid aspect-square place-items-center rounded-lg bg-surface-muted text-2xl hover:bg-border" aria-label={`Tile ${i + 1}`}>
            {i === p.odd ? p.b : p.a}
          </button>
        ))}
      </div>
    </div>
  );
}
