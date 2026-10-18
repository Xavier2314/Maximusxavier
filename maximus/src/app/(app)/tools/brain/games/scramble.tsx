"use client";

import { useRef, useState } from "react";
import { shuffle } from "@/lib/games";
import type { GameProps } from "../game-host";
import { StartScreen, Stat, useCountdown } from "./_ui";

const WORDS = ["PROSPECT", "SPONSOR", "TEAM", "GOAL", "FOCUS", "SAVINGS", "INCOME", "LEADER", "PRODUCT", "CUSTOMER", "FREELANCE", "BUDGET", "PROFIT", "HABIT", "VISION",
  "MENTOR", "GROWTH", "MARKET", "ORDER", "PLANNER", "SUCCESS", "INVEST", "DISCIPLINE", "MINDSET", "NETWORK", "BRAND", "SKILL", "CLIENT", "TARGET", "ACTION"];

function scramble(w: string) {
  let s = w;
  while (s === w) s = shuffle([...w]).join("");
  return s;
}

export default function Scramble({ onDone }: GameProps) {
  const [running, setRunning] = useState(false);
  const [words] = useState(() => shuffle(WORDS));
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(() => scramble(words[0]));
  const [val, setVal] = useState("");
  const [score, setScore] = useState(0);
  const scoreRef = useRef(0);
  const ended = useRef(false);
  const left = useCountdown(90, running, () => { ended.current = true; setRunning(false); onDone({ score: scoreRef.current, duration_ms: 90000 }); });
  function next() { const n = (i + 1) % words.length; setI(n); setShown(scramble(words[n])); setVal(""); }
  if (!running && !ended.current) return <StartScreen title="90 seconds. Unscramble as many words as you can." onStart={() => setRunning(true)}>All words are about business and growth.</StartScreen>;
  if (ended.current) return <p className="py-8 text-center">Time! {score} words.</p>;
  return (
    <form className="mx-auto max-w-sm space-y-4 py-2 text-center" onSubmit={(e) => {
      e.preventDefault();
      if (val.trim().toUpperCase() === words[i]) { scoreRef.current++; setScore(scoreRef.current); next(); }
    }}>
      <div className="flex justify-center gap-2"><Stat label="Time" value={`${left}s`} /><Stat label="Words" value={score} /></div>
      <p className="font-mono text-4xl font-bold tracking-[0.3em]">{shown}</p>
      <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} aria-label="Your answer" autoCapitalize="characters" autoComplete="off"
        className="h-14 w-full rounded-2xl border-2 border-border bg-surface text-center text-2xl font-semibold uppercase outline-none focus:border-primary" />
      <div className="flex justify-center gap-2">
        <button type="submit" className="h-11 rounded-xl bg-primary px-6 font-semibold text-primary-fg">Check</button>
        <button type="button" onClick={next} className="h-11 rounded-xl bg-surface-muted px-6">Skip</button>
      </div>
    </form>
  );
}
