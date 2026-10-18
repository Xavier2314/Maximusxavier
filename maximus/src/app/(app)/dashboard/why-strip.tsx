import Link from "next/link";
import { Heart, Plus } from "lucide-react";
import { WHY_CATEGORIES, type Motivation } from "@/lib/planner";

const TONES = [
  "from-[#1e3a8a] to-[#3b82f6]", "from-[#14532d] to-[#65a30d]", "from-[#7c2d12] to-[#f59e0b]",
  "from-[#581c87] to-[#db2777]", "from-[#0f766e] to-[#22d3ee]", "from-[#1f2937] to-[#475569]",
];

function daysTo(date: string, today: string) {
  return Math.round((new Date(`${date}T00:00:00Z`).getTime() - new Date(`${today}T00:00:00Z`).getTime()) / 86400000);
}

/** The member's reasons, front and centre on Home. Swipe sideways for more. */
export function WhyStrip({ whys, images, today }: { whys: Motivation[]; images: Record<string, string>; today: string }) {
  if (whys.length === 0) {
    return (
      <Link href="/why" className="group relative block overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-[#7c2d12] via-[#c2410c] to-[#f59e0b] p-6 text-white shadow-[var(--shadow-card)]">
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-white/15 blur-2xl" aria-hidden />
        <p className="flex items-center gap-2 text-sm font-semibold text-white/85"><Heart className="size-4" aria-hidden />My Why</p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight">Who are you doing this for?</p>
        <p className="mt-1 max-w-lg text-white/85">Write your reason, add a photo of your dream, and see it here every time you open the app.</p>
        <span className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-4 font-semibold text-[#9a3412] group-hover:bg-white/90">
          <Plus className="size-4" aria-hidden />Write my Why
        </span>
      </Link>
    );
  }
  return (
    <section aria-label="My Why">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight"><Heart className="size-5 text-[#e11d48]" aria-hidden />My Why</h2>
        <Link href="/why" className="text-sm font-medium text-primary hover:underline">{whys.length > 1 ? `All ${whys.length}` : "Add more"}</Link>
      </div>
      <ul className="scrollbar-none -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {whys.map((w, i) => {
          const cat = WHY_CATEGORIES.find((c) => c.key === w.category);
          const img = images[w.id];
          const left = w.target_date ? daysTo(w.target_date, today) : null;
          return (
            <li key={w.id} className={`relative isolate min-h-52 w-[85%] shrink-0 snap-start overflow-hidden rounded-[1.5rem] text-white shadow-[var(--shadow-card)] sm:w-[22rem] ${whys.length === 1 ? "sm:w-full" : ""}`}>
              {img ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img} alt="" className="absolute inset-0 -z-10 size-full object-cover" />
                  <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/45 to-black/10" aria-hidden />
                </>
              ) : (
                <div className={`absolute inset-0 -z-10 bg-gradient-to-br ${TONES[i % TONES.length]}`} aria-hidden />
              )}
              <Link href="/why" className="flex h-full min-h-52 flex-col justify-end p-5">
                <span className="absolute left-4 top-4 inline-flex items-center gap-1 rounded-full bg-black/30 px-2.5 py-1 text-xs font-semibold backdrop-blur-sm">
                  {cat?.emoji} {cat?.label ?? "My why"}
                </span>
                {left !== null && (
                  <span className="absolute right-4 top-4 rounded-full bg-brand-lime px-2.5 py-1 text-xs font-bold text-brand-navy">
                    {left > 0 ? `${left} days to go` : left === 0 ? "Today!" : "Target date passed"}
                  </span>
                )}
                <p className="text-xl font-extrabold leading-snug tracking-tight drop-shadow sm:text-2xl">{w.title}</p>
                {w.body && <p className="mt-1.5 line-clamp-3 text-sm text-white/85">{w.body}</p>}
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
