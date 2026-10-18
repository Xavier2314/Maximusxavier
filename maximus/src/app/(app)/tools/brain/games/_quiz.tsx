"use client";

import { useState } from "react";
import { shuffle } from "@/lib/games";
import type { GameProps } from "../game-host";
import { Choice, StartScreen, Stat } from "./_ui";

export type QuizItem = { q: string; options: string[]; answer: string; explain?: string };

/** Shared multiple-choice runner for riddles and trivia. */
export function Quiz({ bank, rounds, title, onDone }: GameProps & { bank: QuizItem[]; rounds: number; title: string }) {
  const [items] = useState(() => shuffle(bank).slice(0, rounds).map((x) => ({ ...x, options: shuffle(x.options) })));
  const [started, setStarted] = useState(false);
  const [i, setI] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [t0] = useState(Date.now());
  if (!started) return <StartScreen title={title} onStart={() => setStarted(true)}>{rounds} questions. Take your time.</StartScreen>;
  const it = items[i];
  function pick(o: string) {
    if (picked) return;
    setPicked(o);
    if (o === it.answer) setScore((s) => s + 1);
  }
  function next() {
    const s = score;
    if (i + 1 >= items.length) { onDone({ score: s, duration_ms: Date.now() - t0 }); return; }
    setI(i + 1); setPicked(null);
  }
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex gap-2"><Stat label="Question" value={`${i + 1}/${items.length}`} /><Stat label="Score" value={score} /></div>
      <p className="text-lg font-semibold">{it.q}</p>
      <div className="grid gap-2">
        {it.options.map((o) => <Choice key={o} onClick={() => pick(o)} disabled={Boolean(picked)} state={!picked ? null : o === it.answer ? "right" : o === picked ? "wrong" : null}>{o}</Choice>)}
      </div>
      {picked && (
        <div className="space-y-3">
          {it.explain && <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm">{it.explain}</p>}
          <button type="button" onClick={next} className="h-11 rounded-xl bg-primary px-6 font-semibold text-primary-fg">{i + 1 >= items.length ? "Finish" : "Next"}</button>
        </div>
      )}
    </div>
  );
}
