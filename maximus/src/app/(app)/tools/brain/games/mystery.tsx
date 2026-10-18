"use client";

import { useState } from "react";
import { shuffle } from "@/lib/games";
import type { GameProps } from "../game-host";
import { Choice, Stat } from "./_ui";

type Case = { title: string; story: string; suspects: string[]; clues: string[]; answer: string; why: string };

const CASES: Case[] = [
  { title: "The missing sales sheet", story: "Someone took the office's weekly sales sheet from the desk before the meeting.",
    suspects: ["Ada", "Bayo", "Chika", "Dayo"],
    clues: ["The person who took it was in the office before 9am.", "Bayo arrived at 10am.", "Chika and Dayo arrived together at 8:30am.", "Dayo was at the front desk the whole time with the receptionist.", "Ada was at a client visit all morning."],
    answer: "Chika", why: "Bayo arrived late, Ada was out, Dayo had an alibi. Only Chika was in early without an alibi." },
  { title: "Who finished first?", story: "Four members ran a 25-minute Pomodoro challenge. Who finished their task first?",
    suspects: ["Emeka", "Funmi", "Gbenga", "Halima"],
    clues: ["Funmi finished after Gbenga.", "Halima finished before Emeka.", "Gbenga finished after Halima.", "Emeka finished last."],
    answer: "Halima", why: "Halima before Gbenga, Gbenga before Funmi, and Emeka was last, so Halima was first." },
  { title: "The broken printer", story: "The office printer jammed. One person was printing when it happened.",
    suspects: ["Ife", "Jide", "Kemi", "Lola"],
    clues: ["The person printed more than 20 pages.", "Ife printed 5 pages.", "Kemi printed 40 pages but only in colour, and the jam was in black-and-white.", "Lola didn't print anything today.", "Jide printed 30 black-and-white pages."],
    answer: "Jide", why: "Only Jide printed over 20 black-and-white pages." },
  { title: "The surprise cake", story: "Someone bought a cake for the team leader's birthday. Who was it?",
    suspects: ["Musa", "Ngozi", "Ola", "Peju"],
    clues: ["The buyer paid with a bank transfer.", "Musa only pays with cash.", "The buyer lives near the bakery in Lekki.", "Ngozi lives in Ikeja.", "Ola paid by transfer and lives in Lekki.", "Peju lives in Lekki but forgot her phone at home that day."],
    answer: "Ola", why: "Transfer + Lekki leaves Ola and Peju; Peju had no phone to transfer." },
  { title: "Top recruiter", story: "Who recruited the most new members this month?",
    suspects: ["Rita", "Sola", "Tunde", "Uche"],
    clues: ["The top recruiter is not a team leader.", "Rita and Tunde are team leaders.", "Uche recruited fewer than Sola.", "Sola recruited more than both team leaders."],
    answer: "Sola", why: "Not Rita or Tunde (team leaders); Sola beat Uche, so Sola." },
  { title: "The early bird", story: "One member checked in first at the office this morning.",
    suspects: ["Victor", "Wale", "Yemi", "Zainab"],
    clues: ["The first person to check in used the QR code.", "Victor checked in with GPS only.", "Yemi arrived after Wale.", "Zainab arrived after Yemi.", "Wale scanned the QR code."],
    answer: "Wale", why: "Wale arrived before Yemi, who arrived before Zainab; Victor didn't use the QR code." },
];

export default function Mystery({ onDone }: GameProps) {
  const [cases] = useState(() => shuffle(CASES).slice(0, 4));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [solved, setSolved] = useState(0);
  const [t0] = useState(Date.now());
  const c = cases[i];
  function pick(s: string) { if (picked) return; setPicked(s); if (s === c.answer) setSolved((n) => n + 1); }
  function next() { if (i + 1 >= cases.length) { onDone({ score: solved, duration_ms: Date.now() - t0 }); return; } setI(i + 1); setPicked(null); }
  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div className="flex gap-2"><Stat label="Case" value={`${i + 1}/${cases.length}`} /><Stat label="Solved" value={solved} /></div>
      <div>
        <p className="text-lg font-semibold">🕵️ {c.title}</p>
        <p className="text-sm text-fg-muted">{c.story}</p>
      </div>
      <ol className="list-decimal space-y-1 rounded-xl bg-surface-muted py-3 pl-8 pr-4 text-sm">{c.clues.map((x) => <li key={x}>{x}</li>)}</ol>
      <div className="grid grid-cols-2 gap-2">
        {c.suspects.map((s) => <Choice key={s} onClick={() => pick(s)} disabled={Boolean(picked)} state={!picked ? null : s === c.answer ? "right" : s === picked ? "wrong" : null}>{s}</Choice>)}
      </div>
      {picked && (
        <div className="space-y-3">
          <p className="rounded-xl bg-surface-muted px-4 py-3 text-sm">{c.why}</p>
          <button type="button" onClick={next} className="h-11 rounded-xl bg-primary px-6 font-semibold text-primary-fg">{i + 1 >= cases.length ? "Finish" : "Next case"}</button>
        </div>
      )}
    </div>
  );
}
