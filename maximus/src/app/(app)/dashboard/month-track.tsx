import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * The month as one track: a dot for every day (green where you checked in at the office, black
 * ring for today) above a rail that fills blue as this month's goals move. Showing up and the
 * goal read as one picture.
 */
export function MonthTrack({ monthName, daysInMonth, today, checkIns, goalPct, hasGoals }: {
  monthName: string; daysInMonth: number; today: number; checkIns: number[]; goalPct: number; hasGoals: boolean;
}) {
  const present = new Set(checkIns);
  const shown = present.size;
  // Centre of today's dot, so the pace mark on the rail sits right under it.
  const pace = ((today - 0.5) / daysInMonth) * 100;
  const fill = Math.min(100, goalPct);
  return (
    <Link href="/goals" className="block rounded-[26px] bg-surface p-5 transition-colors hover:bg-surface-muted sm:p-6">
      <span className="flex items-baseline justify-between gap-4">
        <span className="font-display text-[26px] leading-none tracking-[-0.02em]">{monthName}</span>
        <span className="text-right text-sm text-fg-muted">
          {hasGoals
            ? <><span className="font-display text-[26px] leading-none tracking-[-0.02em] text-brand-blue tabular-nums">{goalPct}%</span> of goals</>
            : "No goals set"}
        </span>
      </span>

      <span className="mt-5 grid items-center" style={{ gridTemplateColumns: `repeat(${daysInMonth}, minmax(0, 1fr))` }} aria-hidden>
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = i + 1;
          const isToday = day === today;
          return (
            <span key={day} className="grid h-5 place-items-center">
              <span className={cn("rounded-full",
                isToday ? "size-4 ring-2 ring-fg ring-offset-2 ring-offset-surface" : "size-1.5 sm:size-2",
                present.has(day) ? "bg-tile-green" : day < today ? "bg-fg/25" : isToday ? "bg-bg" : "bg-fg/10")} />
            </span>
          );
        })}
      </span>

      <span className="relative mt-3 block h-2 rounded-full bg-bg" role="progressbar" aria-valuenow={fill} aria-valuemin={0} aria-valuemax={100}
        aria-label={hasGoals ? `${goalPct}% of ${monthName} goals` : `${monthName} goals not set`}>
        <span className="absolute inset-y-0 left-0 rounded-full bg-brand-blue" style={{ width: `${fill}%` }} />
        <span className="absolute -inset-y-1 w-0.5 rounded-full bg-fg/40" style={{ left: `${pace}%` }} />
      </span>

      <span className="mt-3 flex justify-between text-sm text-fg-muted">
        <span><span className="font-medium text-fg tabular-nums">{shown}</span> {shown === 1 ? "day" : "days"} at the office</span>
        <span className="tabular-nums">Day {today} of {daysInMonth}</span>
      </span>
    </Link>
  );
}
