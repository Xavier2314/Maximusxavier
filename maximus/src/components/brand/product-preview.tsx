import { Check, MapPin, Phone } from "lucide-react";

/**
 * A small, static picture of the Maximus Home screen for the public pages:
 * the navy day board with this month's goal arc, and the start of the Today list.
 * Decorative: the same information is in the page copy, so it's hidden from screen readers.
 */
export function ProductPreview({ className }: { className?: string }) {
  const arc = "M 18.2 81.8 A 45 45 0 1 1 81.8 81.8";
  return (
    <div className={className} aria-hidden>
      <div className="overflow-hidden rounded-2xl border border-border bg-bg shadow-[0_24px_60px_-24px_rgb(15_23_42/0.35)]">
        <div className="bg-brand-navy p-5 text-white">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm text-white/70">Monday</p>
              <p className="text-3xl font-semibold leading-none tracking-tight">9 November</p>
              <p className="mt-2 text-sm text-white/70"><span className="text-white">Adaeze Okafor</span>, member MX-000214</p>
              <span className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg bg-brand-orange px-3 text-sm font-medium text-brand-navy">
                <MapPin className="size-4" />Check in
              </span>
            </div>
            <div className="relative size-24 shrink-0">
              <svg viewBox="0 0 100 100" className="size-full">
                <path d={arc} fill="none" stroke="rgb(255 255 255 / 0.15)" strokeWidth={8} strokeLinecap="round" />
                <path d={arc} fill="none" stroke="var(--brand-orange)" strokeWidth={8} strokeLinecap="round" pathLength={100} strokeDasharray="64 100" />
              </svg>
              <span className="absolute inset-0 grid place-content-center text-center">
                <span className="text-xl font-semibold leading-none">64%</span>
                <span className="mt-1 text-[11px] text-white/70">of goals</span>
              </span>
            </div>
          </div>
        </div>
        <div className="bg-surface px-3 py-2">
          <div className="flex items-baseline justify-between px-2 pb-1 pt-2">
            <span className="font-semibold">Today</span>
            <span className="text-sm text-fg-subtle">2 of 5 done</span>
          </div>
          <ul className="divide-y divide-border text-sm">
            <li className="flex items-center gap-3 px-2 py-2.5"><Phone className="size-4 text-fg-subtle" /><span>Follow up with Ibrahim Danladi<span className="block text-danger">Follow-up, overdue</span></span></li>
            <li className="flex items-center gap-3 px-2 py-2.5"><span className="size-4 rounded-full border-2 border-fg-subtle/50" /><span>Invite two people to Tuesday&apos;s meeting<span className="block text-fg-subtle">Prospecting</span></span></li>
            <li className="flex items-center gap-3 px-2 py-2.5"><span className="grid size-4 place-items-center rounded-full bg-success text-white"><Check className="size-3" strokeWidth={3} /></span><span className="text-fg-subtle line-through">Log yesterday&apos;s orders</span></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
