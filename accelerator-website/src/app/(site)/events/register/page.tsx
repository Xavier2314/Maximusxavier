import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin } from "lucide-react";
import { FeeTable } from "@/components/FeeTable";
import { BankDetails } from "@/components/BankDetails";
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
  const formUrl = site.registrationFormUrl;

  const steps = [
    { t: "Find your fee", d: "Check the fee for your membership position in the table." },
    { t: "Pay by bank transfer", d: "Transfer the exact amount to the official account. Use your full name as the narration." },
    { t: "Submit the registration form", d: "Fill in the official form and add your proof of payment. The team will confirm your place." },
  ];

  return (
    <>
      <section className="grain relative isolate overflow-hidden bg-navy text-white">
        <Facets side="right" className="pointer-events-none absolute -right-8 top-24 hidden h-[440px] w-auto md:block" />
        <div className="container-x relative pb-16 pt-36 md:pb-20 md:pt-44">
          <p className="eyebrow">Registration</p>
          <h1 className="display-lg mt-5 max-w-3xl">Register for {event.name}</h1>
          <div className="mt-8 flex flex-wrap gap-x-8 gap-y-3 text-mist">
            <span className="inline-flex items-center gap-2"><CalendarDays size={18} className="text-red" aria-hidden="true" />{formatLagosDate(event.startsAt, true)}</span>
            {event.city && <span className="inline-flex items-center gap-2"><MapPin size={18} className="text-red" aria-hidden="true" />{event.city}</span>}
          </div>
          {open ? (
            <p className="mt-8 inline-block bg-red px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]">{open.name} registration open{open.salesEnd ? ` until ${formatLagos(open.salesEnd)}` : ""}</p>
          ) : next ? (
            <p className="mt-8 inline-block bg-white/10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em]">{next.name} opens {formatLagos(next.salesStart)}</p>
          ) : null}
          <div className="mt-10">
            <a href={formUrl} target="_blank" rel="noopener noreferrer" className="btn btn-red">Click here to register <ArrowUpRight size={16} aria-hidden="true" /></a>
          </div>
        </div>
      </section>

      <section className="bg-cream py-20 md:py-28">
        <div className="container-x">
          <ol className="grid gap-px bg-sand md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.t} className="bg-cream p-6 md:p-8">
                <span className="font-display text-4xl italic text-red">0{i + 1}</span>
                <h2 className="mt-4 font-display text-2xl text-navy">{s.t}</h2>
                <p className="mt-2 text-sm leading-relaxed text-ink/75">{s.d}</p>
              </li>
            ))}
          </ol>

          <div className="mt-16 grid gap-14 lg:grid-cols-12">
            <div className="lg:col-span-7">
              <p className="eyebrow">Step 1</p>
              <h2 className="display-md mt-3 text-navy">Fees by membership position</h2>
              <div className="mt-8 bg-white p-6 md:p-8"><FeeTable /></div>
            </div>
            <div className="space-y-12 lg:col-span-5">
              <div>
                <p className="eyebrow">Step 2</p>
                <h2 className="display-md mt-3 text-navy">Pay by bank transfer</h2>
                <p className="mt-4 text-sm text-ink/75">Transfer the exact fee for your position. Use your <b>full name</b> as the narration and keep your receipt.</p>
                <div className="mt-6"><BankDetails /></div>
                <p className="mt-4 text-xs text-slate">Pay only into this official account. Never send money to an account shared any other way.</p>
              </div>
              <div className="bg-navy p-8 text-white">
                <p className="eyebrow">Step 3</p>
                <h2 className="mt-3 font-display text-3xl">Submit your registration</h2>
                <p className="mt-3 text-sm text-mist">Fill in the official registration form and attach your proof of payment. Your place is confirmed once the team verifies your payment.</p>
                <a href={formUrl} target="_blank" rel="noopener noreferrer" className="btn btn-red mt-8 w-full">Click here to submit your registration <ArrowUpRight size={16} aria-hidden="true" /></a>
              </div>
            </div>
          </div>
          <p className="mt-12 text-center text-sm text-slate">Questions about registration? <Link href="/contact?topic=Event%20enquiry" className="underline">Contact the events team</Link>.</p>
        </div>
      </section>
    </>
  );
}
