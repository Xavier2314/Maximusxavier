"use client";

import { useEffect, useRef, useState } from "react";
import { randInt } from "@/lib/games";
import { cn } from "@/lib/utils";
import type { GameProps } from "../game-host";
import { StartScreen, Stat } from "./_ui";

const LETTERS = "BCDFGHKLMNPRST";
const TRIALS = 22, N = 2, STEP = 2500;

function makeSeq() {
  const s: string[] = [];
  for (let i = 0; i < TRIALS; i++) s.push(i >= N && Math.random() < 0.33 ? s[i - N] : LETTERS[randInt(0, LETTERS.length - 1)]);
  return s;
}

export default function NBack({ onDone }: GameProps) {
  const [seq] = useState(makeSeq);
  const [i, setI] = useState(-1);
  const [answered, setAnswered] = useState(false);
  const [feedback, setFeedback] = useState<"right" | "wrong" | null>(null);
  const right = useRef(0);
  const responded = useRef(false);

  useEffect(() => {
    if (i < 0 || i >= TRIALS) return;
    responded.current = false;
    setAnswered(false); setFeedback(null);
    const t = setTimeout(() => {
      const isMatch = i >= N && seq[i] === seq[i - N];
      if (!responded.current && !isMatch && i >= N) right.current++;
      if (i + 1 >= TRIALS) {
        const scored = TRIALS - N;
        onDone({ score: Math.round((right.current / scored) * 100), level: `${N}-back` });
      }
      setI(i + 1);
    }, STEP);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i]);

  function match() {
    if (i < N || answered || i >= TRIALS) return;
    responded.current = true;
    setAnswered(true);
    const ok = seq[i] === seq[i - N];
    if (ok) right.current++;
    setFeedback(ok ? "right" : "wrong");
  }

  if (i < 0) return <StartScreen title="2-back" onStart={() => setI(0)}>Letters appear one at a time. Tap <b>Match</b> when the letter is the same as the one 2 steps back. Do nothing if it isn&apos;t.</StartScreen>;
  if (i >= TRIALS) return <p className="py-8 text-center">Done!</p>;
  return (
    <div className="space-y-5 py-2 text-center">
      <Stat label="Trial" value={`${i + 1}/${TRIALS}`} />
      <p key={i} className={cn("mx-auto grid size-32 place-items-center rounded-3xl text-6xl font-bold", feedback === "right" ? "bg-success-soft" : feedback === "wrong" ? "bg-danger-soft" : "bg-surface-muted")}>{seq[i]}</p>
      <button type="button" onClick={match} disabled={i < N || answered} className="h-14 w-48 rounded-2xl bg-primary text-lg font-semibold text-primary-fg disabled:opacity-50">Match</button>
    </div>
  );
}
