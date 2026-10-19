import Link from "next/link";
import { Trophy } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { rankLabel } from "@/lib/ranks";
import { formatMoney } from "@/lib/utils";

export type Winner = {
  position: number; total: number; orders: number; office_id: string | null; user_id: string;
  profiles: { full_name: string; avatar_url: string | null; business_rank: string | null } | null;
};

const MEDAL = ["🥇", "🥈", "🥉"];
const CONFETTI = ["🎉", "✨", "🎊", "⭐", "🎉", "✨", "🎊", "⭐", "🎉", "✨"];

/** Monday-to-Sunday banner celebrating last week's top earners (from orders). */
export function TopEarnersBanner({ winners, officeWinner, viewerId }: { winners: Winner[]; officeWinner: Winner | null; viewerId: string }) {
  const first = winners.find((w) => w.position === 1);
  if (!first) return null;
  const rest = winners.filter((w) => w.position > 1).sort((a, b) => a.position - b.position);
  const isMe = (w: Winner) => w.user_id === viewerId;
  return (
    <section aria-label="Top earners of the week"
      className="relative isolate overflow-hidden rounded-[1.75rem] bg-gradient-to-br from-[#78350f] via-[#b45309] to-[#f59e0b] p-5 text-white shadow-[var(--shadow-card)] sm:p-7">
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden>
        {CONFETTI.map((c, i) => (
          <span key={i} className="absolute animate-[confetti_6s_linear_infinite] text-lg opacity-80"
            style={{ left: `${(i * 97) % 100}%`, top: "-10%", animationDelay: `${i * 0.6}s` }}>{c}</span>
        ))}
      </div>
      <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-white/85"><Trophy className="size-4" aria-hidden />Top earner of last week</p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <div className="relative">
          <Avatar name={first.profiles?.full_name ?? "Winner"} src={first.profiles?.avatar_url} size={84} className="ring-4 ring-[#fde68a]" />
          <span className="absolute -bottom-2 -right-2 text-3xl" aria-hidden>🥇</span>
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-extrabold leading-tight sm:text-3xl">{first.profiles?.full_name}{isMe(first) && " (you!)"}</p>
          {rankLabel(first.profiles?.business_rank) && <p className="mt-1 inline-block rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-semibold">{rankLabel(first.profiles?.business_rank)}</p>}
          <p className="mt-2 text-white/90"><b>{formatMoney(first.total)}</b> in orders · {first.orders} order{first.orders === 1 ? "" : "s"}</p>
        </div>
      </div>
      {(rest.length > 0 || officeWinner) && (
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          {rest.map((w) => (
            <div key={w.position} className="flex items-center gap-3 rounded-2xl bg-black/15 p-3">
              <span className="text-2xl" aria-hidden>{MEDAL[w.position - 1]}</span>
              <Avatar name={w.profiles?.full_name ?? ""} src={w.profiles?.avatar_url} size={36} />
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold">{w.profiles?.full_name}{isMe(w) && " (you)"}</span>
                <span className="block text-xs text-white/80">{formatMoney(w.total)}</span>
              </span>
            </div>
          ))}
          {officeWinner && (
            <div className="flex items-center gap-3 rounded-2xl bg-white/20 p-3">
              <span className="text-2xl" aria-hidden>🏅</span>
              <Avatar name={officeWinner.profiles?.full_name ?? ""} src={officeWinner.profiles?.avatar_url} size={36} />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-white/80">Your office&apos;s top earner</span>
                <span className="block truncate text-sm font-semibold">{officeWinner.profiles?.full_name}{isMe(officeWinner) && " (you)"}</span>
              </span>
            </div>
          )}
        </div>
      )}
      <p className="mt-4 text-sm text-white/85">Based on confirmed orders. <Link href="/orders" className="font-semibold underline underline-offset-2">Record your orders</Link> to be next Monday&apos;s winner!</p>
    </section>
  );
}
