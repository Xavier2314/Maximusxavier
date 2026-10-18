"use client";

import { useEffect, useState } from "react";
import { randInt } from "@/lib/games";
import { cn } from "@/lib/utils";
import { chime } from "@/lib/sound";
import type { GameProps } from "../game-host";
import { StartScreen, Stat } from "./_ui";

const PADS = ["bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-400"];

export default function Recall({ onDone }: GameProps) {
  const [seq, setSeq] = useState<number[]>([]);
  const [showing, setShowing] = useState(-1);
  const [input, setInput] = useState<number[]>([]);
  const [playing, setPlaying] = useState(false);
  const [over, setOver] = useState(false);

  useEffect(() => {
    if (!seq.length) return;
    setPlaying(true);
    let k = 0;
    const t = setInterval(() => {
      if (k >= seq.length * 2) { clearInterval(t); setShowing(-1); setPlaying(false); return; }
      setShowing(k % 2 === 0 ? seq[k / 2] : -1);
      k++;
    }, 380);
    return () => clearInterval(t);
  }, [seq]);

  function press(p: number) {
    if (playing || over) return;
    const next = [...input, p];
    setShowing(p); setTimeout(() => setShowing(-1), 150);
    if (seq[next.length - 1] !== p) { setOver(true); onDone({ score: seq.length - 1, level: `level ${seq.length - 1}` }); return; }
    if (next.length === seq.length) { chime(1); setInput([]); setTimeout(() => setSeq([...seq, randInt(0, 3)]), 600); }
    else setInput(next);
  }

  if (!seq.length) return <StartScreen title="Watch the colours, then repeat them" onStart={() => setSeq([randInt(0, 3)])}>The sequence grows by one each round.</StartScreen>;
  return (
    <div className="space-y-4 text-center">
      <Stat label="Level" value={seq.length} />
      <p className="text-sm text-fg-muted">{over ? "Wrong colour!" : playing ? "Watch…" : "Your turn"}</p>
      <div className="mx-auto grid max-w-xs grid-cols-2 gap-3">
        {PADS.map((c, i) => (
          <button key={i} type="button" onClick={() => press(i)} aria-label={`Pad ${i + 1}`}
            className={cn("aspect-square rounded-3xl transition-all", c, showing === i ? "scale-95 opacity-100 ring-4 ring-white" : "opacity-40")} />
        ))}
      </div>
    </div>
  );
}
