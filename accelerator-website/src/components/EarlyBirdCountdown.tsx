import { Countdown } from "./Countdown";
import { formatLagos, ticketStatus, type TicketType } from "@/lib/tickets";

/** Big "Early Bird ends in" countdown. Renders nothing once Early Bird is no longer on sale. */
export function EarlyBirdCountdown({ tickets, serverNow, className = "" }: { tickets: TicketType[]; serverNow: number; className?: string }) {
  const eb = tickets.find((t) => t.id === "early_bird");
  if (!eb?.salesEnd || ticketStatus(eb, new Date(serverNow)) !== "on_sale") return null;
  return (
    <div className={`relative overflow-hidden bg-red p-5 text-white shadow-[0_24px_50px_-20px_rgba(225,30,45,.7)] sm:p-7 ${className}`}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/85">Don&rsquo;t miss it</p>
          <p className="mt-1 font-display text-3xl uppercase leading-none sm:text-4xl">Early Bird ends in</p>
          <p className="mt-2 text-sm text-white/85">Closes {formatLagos(eb.salesEnd)} (Lagos time). Late Registration opens 1 November.</p>
        </div>
        <div className="min-w-0 lg:w-[440px]">
          <Countdown target={eb.salesEnd} serverNow={serverNow} doneText="Early Bird has ended. Late Registration is now open." />
        </div>
      </div>
    </div>
  );
}
