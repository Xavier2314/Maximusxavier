import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { RegisterFlow } from "@/components/RegisterFlow";
import { Facets } from "@/components/Facets";
import { getEventSettings, getTickets } from "@/lib/content";
import { formatLagos, formatLagosDate, ticketStatus } from "@/lib/tickets";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Register",
  description: "Register for Accelerators Events 2026, Saturday 5 December 2026, Ibadan. See the fee for your membership position, pay by bank transfer and submit the registration form.",
  alternates: { canonical: "/events/register" },
};

export default async function RegisterPage() {
  const [tickets, event] = await Promise.all([getTickets(), getEventSettings()]);
  const now = new Date();
  const open = tickets.find((t) => ticketStatus(t, now) === "on_sale");
  const next = tickets.find((t) => ticketStatus(t, now) === "upcoming");

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-navy text-white">
        <Facets side="right" className="pointer-events-none absolute -right-8 top-16 hidden h-[340px] w-auto md:block" />
        <div className="container-x relative pb-10 pt-32 md:pb-14 md:pt-40">
          <p className="eyebrow">Registration</p>
          <h1 className="display-lg mt-4 max-w-3xl">Register for {event.name}</h1>
          {event.theme && <p className="mt-3 font-display text-2xl italic text-[#9DB2FF]">{event.theme}</p>}
          <div className="mt-6 flex flex-wrap items-center gap-x-8 gap-y-3 text-mist">
            <span className="inline-flex items-center gap-2"><CalendarDays size={18} className="text-red" aria-hidden="true" />{formatLagosDate(event.startsAt, true)}</span>
            {event.city && <span className="inline-flex items-center gap-2"><MapPin size={18} className="text-red" aria-hidden="true" />{event.city}</span>}
            {open ? (
              <span className="bg-red px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">{open.name} registration open{open.salesEnd ? ` until ${formatLagos(open.salesEnd)}` : ""}</span>
            ) : next ? (
              <span className="bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">{next.name} opens {formatLagos(next.salesStart)}</span>
            ) : null}
          </div>
          <p className="mt-6 max-w-2xl text-sm text-mist md:text-base">Three simple steps: <b className="text-white">choose your position</b> to see your fee, <b className="text-white">pay into the official account</b>, then <b className="text-white">submit the registration form</b> with your receipt.</p>
        </div>
      </section>

      <section className="bg-cream py-12 md:py-16">
        <div className="container-x">
          <RegisterFlow formUrl={site.registrationFormUrl} />
          <p className="mt-12 text-center text-sm text-slate">Questions about registration? <Link href="/contact?topic=Event%20enquiry" className="underline">Contact the events team</Link>.</p>
        </div>
      </section>
    </>
  );
}
