/** This month's goal progress, drawn as an open arc like the base of the Maximus logo. */
export function GoalArc({ value, className }: { value: number; className?: string }) {
  const v = Math.max(0, Math.min(100, value));
  // A 270° arc open at the bottom.
  const d = "M 18.2 81.8 A 45 45 0 1 1 81.8 81.8";
  return (
    <div className={className} style={{ position: "relative" }} role="img" aria-label={`${v}% of this month's goals`}>
      <svg viewBox="0 0 100 100" className="size-full" aria-hidden>
        <path d={d} fill="none" stroke="currentColor" strokeWidth={8} strokeLinecap="round" className="text-white/15" />
        {v > 0 && (
          <path d={d} fill="none" stroke="var(--brand-orange)" strokeWidth={8} strokeLinecap="round"
            pathLength={100} strokeDasharray={`${v} 100`} className="transition-[stroke-dasharray] duration-700 ease-out" />
        )}
      </svg>
      <div className="absolute inset-0 grid place-content-center text-center">
        <span className="text-3xl font-medium leading-none tracking-tight tabular-nums lg:text-4xl">{v}%</span>
        <span className="mt-1.5 text-sm text-white/70">of goals</span>
      </div>
    </div>
  );
}
