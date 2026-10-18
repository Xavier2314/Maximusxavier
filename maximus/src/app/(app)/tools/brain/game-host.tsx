"use client";

import { useState, useTransition, type ComponentType } from "react";
import dynamic from "next/dynamic";
import { RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import type { GameResult } from "@/lib/games";
import { saveGameScoreAction } from "../actions";

export type GameProps = { onDone: (r: GameResult) => void };

const load = (f: () => Promise<{ default: ComponentType<GameProps> }>) =>
  dynamic(f, { ssr: false, loading: () => <p className="py-10 text-center text-sm text-fg-muted">Loading game…</p> });

const GAMES: Record<string, ComponentType<GameProps>> = {
  chess: load(() => import("./games/chess")),
  sudoku: load(() => import("./games/sudoku")),
  g2048: load(() => import("./games/g2048")),
  memory: load(() => import("./games/memory")),
  sequence: load(() => import("./games/sequence")),
  math: load(() => import("./games/math")),
  scramble: load(() => import("./games/scramble")),
  riddles: load(() => import("./games/riddles")),
  pattern: load(() => import("./games/pattern")),
  reaction: load(() => import("./games/reaction")),
  nback: load(() => import("./games/nback")),
  difference: load(() => import("./games/difference")),
  hanoi: load(() => import("./games/hanoi")),
  maze: load(() => import("./games/maze")),
  trivia: load(() => import("./games/trivia")),
  rotation: load(() => import("./games/rotation")),
  wordsearch: load(() => import("./games/wordsearch")),
  recall: load(() => import("./games/recall")),
  nonogram: load(() => import("./games/nonogram")),
  mystery: load(() => import("./games/mystery")),
};

/** Runs one game, saves the score when it ends and shows the personal best. */
export function GameHost({ slug, best: initialBest, unit, higherIsBetter }: { slug: string; best: number | null; unit: string; higherIsBetter: boolean }) {
  const [round, setRound] = useState(0);
  const [result, setResult] = useState<GameResult | null>(null);
  const [best, setBest] = useState(initialBest);
  const [msg, setMsg] = useState<string | null>(null);
  const [, start] = useTransition();
  const Game = GAMES[slug];

  function onDone(r: GameResult) {
    const score = Math.max(0, Math.round(r.score));
    setResult({ ...r, score });
    start(async () => {
      const res = await saveGameScoreAction({ game: slug, score, level: r.level ?? null, duration_ms: r.duration_ms ? Math.round(r.duration_ms) : null, won: r.won ?? null });
      if (res.ok && res.data) setBest(res.data.best);
      else setMsg(res.message);
    });
  }
  const isRecord = result && best !== null && result.score === best && (initialBest === null || (higherIsBetter ? result.score > initialBest : result.score < initialBest));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <p className="inline-flex items-center gap-1.5 text-fg-muted"><Trophy className="size-4 text-warning" aria-hidden /> Personal best: <b className="text-fg">{best ?? "—"}</b> {best !== null ? unit : ""}</p>
        <Button variant="outline" size="sm" onClick={() => { setRound((n) => n + 1); setResult(null); setMsg(null); }}><RotateCcw className="size-4" aria-hidden /> New game</Button>
      </div>
      {result && (
        <Card className={isRecord ? "border-2 border-brand-green" : undefined}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{isRecord ? "🎉 New personal best!" : result.won === false ? "Game over" : "Well played!"}</p>
              <p className="text-sm text-fg-muted">Score: <b className="text-fg">{result.score} {unit}</b>{result.level ? ` · ${result.level}` : ""}{result.duration_ms ? ` · ${Math.round(result.duration_ms / 1000)}s` : ""}</p>
              {msg && <p className="text-xs text-danger">{msg}</p>}
            </div>
            <Button onClick={() => { setRound((n) => n + 1); setResult(null); }}><RotateCcw className="size-4" aria-hidden /> Play again</Button>
          </CardBody>
        </Card>
      )}
      <Card><CardBody>{Game ? <Game key={round} onDone={onDone} /> : <p>Game not found.</p>}</CardBody></Card>
    </div>
  );
}
