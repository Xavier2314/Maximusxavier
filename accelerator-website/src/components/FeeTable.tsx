import { positionsAt } from "@/lib/fees";
import { formatNaira } from "@/lib/tickets";

/** Registration fee by membership position at `now` (Early Bird or Late Registration). */
export function FeeTable({ tone = "light", now = Date.now() }: { tone?: "light" | "dark"; now?: number }) {
  const dark = tone === "dark";
  return (
    <div className={dark ? "text-white" : "text-navy"}>
      <div className={`grid grid-cols-[1fr_auto] border-b-2 pb-3 text-[11px] font-semibold uppercase tracking-[0.22em] ${dark ? "border-white/30 text-mist" : "border-navy text-slate"}`}>
        <span>Membership position</span><span>Fee</span>
      </div>
      <ol>
        {positionsAt(now).map((p, i) => (
          <li key={p.id} className={`grid grid-cols-[1fr_auto] items-baseline gap-4 border-b py-3.5 ${dark ? "border-white/10" : "border-sand"}`}>
            <span className="flex items-baseline gap-4">
              <span className={`w-6 font-display text-sm italic ${dark ? "text-mist" : "text-red"}`}>{String(i + 1).padStart(2, "0")}</span>
              <span className="font-display text-xl">{p.name}</span>
            </span>
            <span className="font-display text-xl tabular-nums">{formatNaira(p.feeKobo)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
