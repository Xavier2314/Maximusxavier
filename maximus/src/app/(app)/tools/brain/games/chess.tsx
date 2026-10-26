"use client";

import { useState } from "react";
import { Chess, type Move, type Square } from "chess.js";
import { cn } from "@/lib/utils";
import type { GameProps } from "../game-host";
import { Stat } from "./_ui";

const GLYPH: Record<string, string> = { wp: "♙", wn: "♘", wb: "♗", wr: "♖", wq: "♕", wk: "♔", bp: "♟", bn: "♞", bb: "♝", br: "♜", bq: "♛", bk: "♚" };
const VALUE: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };
const FILES = "abcdefgh";

function material(g: Chess) {
  let s = 0;
  for (const row of g.board()) for (const p of row) if (p) s += (p.color === "b" ? 1 : -1) * VALUE[p.type];
  return s;
}

/** Simple computer opponent: easy = random with a taste for captures; medium = looks one reply ahead. */
function pickMove(g: Chess, level: "easy" | "medium"): Move {
  const moves = g.moves({ verbose: true });
  if (level === "easy") {
    const caps = moves.filter((m) => m.captured);
    return caps.length && Math.random() < 0.6 ? caps[Math.floor(Math.random() * caps.length)] : moves[Math.floor(Math.random() * moves.length)];
  }
  let best: Move[] = [], bestScore = -Infinity;
  for (const m of moves) {
    g.move(m);
    let score: number;
    if (g.isCheckmate()) score = 1000;
    else {
      let worst = Infinity;
      for (const r of g.moves({ verbose: true })) { g.move(r); worst = Math.min(worst, g.isCheckmate() ? -1000 : material(g)); g.undo(); }
      score = worst === Infinity ? 0 : worst;
    }
    g.undo();
    if (score > bestScore) { bestScore = score; best = [m]; } else if (score === bestScore) best.push(m);
  }
  return best[Math.floor(Math.random() * best.length)];
}

export default function ChessGame({ onDone }: GameProps) {
  const [level, setLevel] = useState<"easy" | "medium" | null>(null);
  const [game] = useState(() => new Chess());
  const [fen, setFen] = useState(game.fen());
  const [sel, setSel] = useState<Square | null>(null);
  const [targets, setTargets] = useState<string[]>([]);
  const [status, setStatus] = useState("Your move (white).");
  const [over, setOver] = useState(false);
  const [t0, setT0] = useState(0);

  function finish() {
    const moves = Math.ceil(game.history().length / 2);
    if (game.isCheckmate()) {
      const youWon = game.turn() === "b";
      setStatus(youWon ? "Checkmate. You win!" : "Checkmate. The computer wins.");
      onDone({ score: youWon ? Math.max(100, (level === "medium" ? 1500 : 800) - moves * 5) : Math.max(0, 50 + material(game) * -5), level: level ?? undefined, won: youWon, duration_ms: Date.now() - t0 });
    } else {
      setStatus("Draw.");
      onDone({ score: level === "medium" ? 300 : 150, level: level ?? undefined, won: false, duration_ms: Date.now() - t0 });
    }
    setOver(true);
  }

  function tap(sq: Square) {
    if (over || game.turn() !== "w") return;
    if (sel && targets.includes(sq)) {
      game.move({ from: sel, to: sq, promotion: "q" });
      setSel(null); setTargets([]); setFen(game.fen());
      if (game.isGameOver()) { finish(); return; }
      setStatus("Computer is thinking…");
      setTimeout(() => {
        game.move(pickMove(game, level ?? "easy"));
        setFen(game.fen());
        if (game.isGameOver()) finish();
        else setStatus(game.inCheck() ? "Check! Your move." : "Your move.");
      }, 300);
      return;
    }
    const p = game.get(sq);
    if (p && p.color === "w") { setSel(sq); setTargets(game.moves({ square: sq, verbose: true }).map((m) => m.to)); }
    else { setSel(null); setTargets([]); }
  }

  if (!level) return (
    <div className="py-6 text-center"><p className="mb-4 font-semibold">You play white. Choose the computer&apos;s level.</p>
      <div className="flex justify-center gap-2">
        <button type="button" onClick={() => { setLevel("easy"); setT0(Date.now()); }} className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-fg">Easy</button>
        <button type="button" onClick={() => { setLevel("medium"); setT0(Date.now()); }} className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-fg">Medium</button>
      </div>
    </div>
  );
  const board = game.board();
  return (
    <div className="space-y-3" data-fen={fen}>
      <div className="flex flex-wrap items-center gap-2"><Stat label="Level" value={level} /><Stat label="Moves" value={Math.ceil(game.history().length / 2)} />
        {!over && <button type="button" onClick={() => { setOver(true); setStatus("You resigned."); onDone({ score: 0, level, won: false, duration_ms: Date.now() - t0 }); }} className="rounded-full bg-surface-muted px-3 py-1 text-sm">Resign</button>}
      </div>
      <p className="text-sm font-medium" aria-live="polite">{status}</p>
      <div className="mx-auto grid max-w-md grid-cols-8 overflow-hidden rounded-xl border border-border">
        {board.flatMap((row, r) => row.map((p, c) => {
          const sq = `${FILES[c]}${8 - r}` as Square;
          const dark = (r + c) % 2 === 1;
          return (
            <button key={sq} type="button" onClick={() => tap(sq)} aria-label={`${sq}${p ? ` ${p.color === "w" ? "white" : "black"} ${p.type}` : ""}`}
              className={cn("relative grid aspect-square place-items-center text-3xl leading-none sm:text-4xl", dark ? "bg-[#b58863]" : "bg-[#f0d9b5]", sel === sq && "ring-4 ring-inset ring-primary")}>
              {p ? <span className={p.color === "w" ? "text-white [text-shadow:0_0_2px_#000,0_0_1px_#000]" : "text-black"}>{GLYPH[p.color + p.type]}</span> : null}
              {targets.includes(sq) && <span className="absolute size-3 rounded-full bg-primary/60" aria-hidden />}
            </button>
          );
        }))}
      </div>
    </div>
  );
}
