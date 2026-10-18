"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Seconds left on a fixed-length round; calls onEnd once. */
export function useCountdown(seconds: number, running: boolean, onEnd: () => void) {
  const [left, setLeft] = useState(seconds);
  useEffect(() => {
    if (!running) return;
    const end = Date.now() + left * 1000;
    const t = setInterval(() => {
      const l = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setLeft(l);
      if (l === 0) { clearInterval(t); onEnd(); }
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);
  return left;
}

export function StartScreen({ title, children, onStart, label = "Start" }: { title: string; children?: React.ReactNode; onStart: () => void; label?: string }) {
  return (
    <div className="mx-auto max-w-md py-6 text-center">
      <p className="text-lg font-semibold">{title}</p>
      {children && <div className="mt-2 text-sm text-fg-muted">{children}</div>}
      <button type="button" onClick={onStart} className="mt-5 h-12 rounded-2xl bg-primary px-8 font-semibold text-primary-fg">{label}</button>
    </div>
  );
}

export function Choice({ children, onClick, state, disabled }: { children: React.ReactNode; onClick: () => void; state?: "right" | "wrong" | null; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className={cn("min-h-12 rounded-xl border-2 px-4 py-2 text-left font-medium transition-colors",
        state === "right" ? "border-success bg-success-soft" : state === "wrong" ? "border-danger bg-danger-soft" : "border-border hover:border-primary")}>
      {children}
    </button>
  );
}

export function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return <span className="rounded-full bg-surface-muted px-3 py-1 text-sm">{label}: <b className="tabular-nums">{value}</b></span>;
}
