"use client";
import { useEffect, useState } from "react";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return { days: Math.floor(s / 86400), hours: Math.floor((s % 86400) / 3600), minutes: Math.floor((s % 3600) / 60), seconds: s % 60 };
}

/** Counts down to an absolute instant. `serverNow` corrects for an inaccurate device clock. */
export function Countdown({ target, serverNow, label }: { target: string; serverNow: number; label?: string }) {
  const [offset] = useState(() => serverNow - Date.now());
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 1000);
    return () => clearInterval(id);
  }, [offset]);
  const left = Date.parse(target) - now;
  const p = parts(left);
  if (left <= 0) return <p className="font-display text-2xl">{label ? `${label}: it's event day` : "It's event day"}</p>;
  const cells: [string, number][] = [["Days", p.days], ["Hours", p.hours], ["Minutes", p.minutes], ["Seconds", p.seconds]];
  return (
    <div role="timer" aria-label={`${p.days} days, ${p.hours} hours and ${p.minutes} minutes to go`} className="grid grid-cols-4 gap-px bg-white/15">
      {cells.map(([k, v]) => (
        <div key={k} className="bg-navy px-3 py-4 text-center sm:px-6">
          <div className="font-display text-4xl tabular-nums sm:text-5xl" aria-hidden="true">{String(v).padStart(2, "0")}</div>
          <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-mist" aria-hidden="true">{k}</div>
        </div>
      ))}
    </div>
  );
}
