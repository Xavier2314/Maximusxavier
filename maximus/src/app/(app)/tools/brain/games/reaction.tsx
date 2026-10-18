"use client";

import { useEffect, useRef, useState } from "react";
import { randInt } from "@/lib/games";
import { cn } from "@/lib/utils";
import type { GameProps } from "../game-host";

const ROUNDS = 5;

export default function Reaction({ onDone }: GameProps) {
  const [phase, setPhase] = useState<"idle" | "wait" | "go" | "early" | "shown">("idle");
  const [times, setTimes] = useState<number[]>([]);
  const goAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  function arm() {
    setPhase("wait");
    timer.current = setTimeout(() => { goAt.current = performance.now(); setPhase("go"); }, randInt(1200, 3500));
  }
  function tap() {
    if (phase === "idle" || phase === "shown" || phase === "early") { arm(); return; }
    if (phase === "wait") { if (timer.current) clearTimeout(timer.current); setPhase("early"); return; }
    const ms = Math.round(performance.now() - goAt.current);
    const next = [...times, ms];
    setTimes(next);
    setPhase("shown");
    if (next.length === ROUNDS) onDone({ score: Math.round(next.reduce((a, b) => a + b, 0) / ROUNDS), level: `best ${Math.min(...next)} ms` });
  }
  const finished = times.length >= ROUNDS;
  return (
    <div>
      <button type="button" onPointerDown={finished ? undefined : tap} disabled={finished}
        className={cn("grid h-72 w-full select-none place-items-center rounded-2xl text-center text-xl font-semibold text-white transition-colors",
          phase === "go" ? "bg-brand-green text-brand-navy" : phase === "wait" ? "bg-danger" : "bg-brand-navy")}>
        {finished ? `Average: ${Math.round(times.reduce((a, b) => a + b, 0) / ROUNDS)} ms`
          : phase === "idle" ? "Tap to start. Wait for green, then tap as fast as you can."
          : phase === "wait" ? "Wait for green…" : phase === "go" ? "TAP!"
          : phase === "early" ? "Too soon! Tap to try again." : `${times[times.length - 1]} ms. Tap for the next round.`}
      </button>
      <p className="mt-3 text-center text-sm text-fg-muted">Round {Math.min(times.length + 1, ROUNDS)} of {ROUNDS}{times.length ? ` · ${times.join(", ")} ms` : ""}</p>
    </div>
  );
}
