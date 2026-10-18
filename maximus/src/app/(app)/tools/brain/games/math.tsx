"use client";

import { useRef, useState } from "react";
import { randInt } from "@/lib/games";
import type { GameProps } from "../game-host";
import { StartScreen, Stat, useCountdown } from "./_ui";

function make(level: number) {
  const ops = level < 4 ? ["+", "-"] : ["+", "-", "×", "÷"];
  const op = ops[randInt(0, ops.length - 1)];
  const max = 10 + level * 6;
  let a = randInt(2, max), b = randInt(2, max);
  if (op === "-" && b > a) [a, b] = [b, a];
  if (op === "×") { a = randInt(2, 6 + level); b = randInt(2, 12); }
  if (op === "÷") { b = randInt(2, 12); a = b * randInt(2, 6 + level); }
  const ans = op === "+" ? a + b : op === "-" ? a - b : op === "×" ? a * b : a / b;
  return { q: `${a} ${op} ${b}`, ans };
}

export default function MentalMath({ onDone }: GameProps) {
  const [running, setRunning] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [p, setP] = useState(() => make(1));
  const [val, setVal] = useState("");
  const done = useRef(false);
  const correctRef = useRef(0); const wrongRef = useRef(0);
  const left = useCountdown(60, running, () => { if (!done.current) { done.current = true; setRunning(false); onDone({ score: correctRef.current, duration_ms: 60000, level: `${wrongRef.current} wrong` }); } });

  if (!running && !done.current) return <StartScreen title="60 seconds. Solve as many as you can." onStart={() => setRunning(true)}>Sums get harder as you go.</StartScreen>;
  if (done.current) return <p className="py-8 text-center">Time! You got {correct} right.</p>;
  return (
    <form className="mx-auto max-w-sm space-y-4 py-4 text-center" onSubmit={(e) => {
      e.preventDefault();
      if (val === "") return;
      if (Number(val) === p.ans) { correctRef.current++; setCorrect(correctRef.current); } else { wrongRef.current++; setWrong(wrongRef.current); }
      setP(make(1 + Math.floor(correctRef.current / 4)));
      setVal("");
    }}>
      <div className="flex justify-center gap-2"><Stat label="Time" value={`${left}s`} /><Stat label="Right" value={correct} /><Stat label="Wrong" value={wrong} /></div>
      <p className="text-5xl font-bold tabular-nums">{p.q}</p>
      <input autoFocus inputMode="numeric" value={val} onChange={(e) => setVal(e.target.value.replace(/[^\d-]/g, ""))} aria-label="Answer"
        className="h-14 w-40 rounded-2xl border-2 border-border bg-surface text-center text-2xl font-semibold outline-none focus:border-primary" />
      <div><button type="submit" className="h-11 rounded-xl bg-primary px-6 font-semibold text-primary-fg">Enter</button></div>
    </form>
  );
}
