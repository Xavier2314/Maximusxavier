"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, Lock, Ticket } from "lucide-react";
import { formatLagos, formatLagosDate, formatNaira, ticketStatus, type TicketType } from "@/lib/tickets";

/**
 * Ticket cards. Status is recomputed on the client every 30 seconds (using the server clock
 * offset) so the switch at midnight Lagos time shows without a reload. The server enforces
 * the same windows on checkout, so the UI state is never the only safeguard.
 */
export function TicketCards({ tickets, serverNow, feeLabel }: { tickets: TicketType[]; serverNow: number; feeLabel?: string }) {
  const [offset] = useState(() => serverNow - Date.now());
  const [now, setNow] = useState(serverNow);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + offset), 30_000);
    return () => clearInterval(id);
  }, [offset]);

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {tickets.map((t) => {
        const status = ticketStatus(t, new Date(now));
        const price = formatNaira(t.priceKobo);
        const live = status === "on_sale";
        const upcoming = status === "upcoming";
        const opens = formatLagosDate(t.salesStart);
        const shortOpens = t.salesStart ? new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Lagos", day: "numeric", month: "long" }).format(new Date(t.salesStart)) : null;
        return (
          <article
            key={t.id}
            aria-labelledby={`t-${t.id}`}
            className={`relative flex flex-col overflow-hidden border transition-all duration-500 ${live ? "border-navy bg-navy text-white shadow-[0_30px_60px_-30px_rgba(11,30,63,.7)]" : "border-sand bg-white text-ink"}`}
          >
            {live && <span className="absolute right-0 top-0 bg-red px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white">Now open</span>}
            {upcoming && (
              <span className="absolute right-0 top-0 inline-flex items-center gap-2 bg-stone px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-navy">
                <Lock size={13} aria-hidden="true" /> Coming {shortOpens}
              </span>
            )}
            {status === "ended" && <span className="absolute right-0 top-0 bg-stone px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate">Closed</span>}

            <div className={`flex flex-1 flex-col p-8 md:p-10 ${upcoming || status === "ended" ? "opacity-60 saturate-50 [filter:blur(0.4px)]" : ""}`}>
              <Ticket size={28} className={live ? "text-red" : "text-slate"} aria-hidden="true" />
              <h3 id={`t-${t.id}`} className="mt-6 font-display text-3xl md:text-4xl">{t.name}</h3>
              <p className={`mt-3 text-sm leading-relaxed ${live ? "text-mist" : "text-slate"}`}>{t.description}</p>

              <div className="mt-8 border-t border-current/15 pt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">Fee</p>
                <p className="mt-2 font-display text-3xl">{price ?? (live && feeLabel ? feeLabel : <span className="text-2xl italic opacity-80">To be announced</span>)}</p>
                {!price && live && feeLabel && <p className="mt-1 text-xs opacity-75">Depends on your membership position</p>}
              </div>

              <dl className="mt-6 space-y-2 text-sm">
                {t.salesStart && (
                  <div className="flex justify-between gap-4"><dt className="opacity-70">Opens</dt><dd className="text-right">{formatLagos(t.salesStart)}</dd></div>
                )}
                {t.salesEnd && (
                  <div className="flex justify-between gap-4"><dt className="opacity-70">Deadline</dt><dd className="text-right">{formatLagos(t.salesEnd)}</dd></div>
                )}
                <div className="flex justify-between gap-4"><dt className="opacity-70">Time zone</dt><dd>Lagos (WAT)</dd></div>
              </dl>

              <div className="mt-6">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] opacity-70">Benefits</p>
                {t.benefits.length ? (
                  <ul className="mt-3 space-y-2 text-sm">
                    {t.benefits.map((b) => (<li key={b} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-red" aria-hidden="true" />{b}</li>))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm italic opacity-75">To be confirmed</p>
                )}
              </div>

              <div className="mt-auto pt-10">
                {live ? (
                  <Link href="/events/register" className="btn btn-red w-full">Register now</Link>
                ) : (
                  <button type="button" className="btn btn-ghost-dark w-full" disabled aria-disabled="true">
                    <Lock size={15} aria-hidden="true" />
                    {upcoming ? `Opens ${opens ?? "soon"}` : status === "ended" ? "Registration closed" : "Unavailable"}
                  </button>
                )}
                {upcoming && <p className="sr-only">{t.name} is not available yet. It opens on {opens} Lagos time.</p>}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
