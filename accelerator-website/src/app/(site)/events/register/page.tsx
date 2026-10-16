import type { Metadata } from "next";
import Link from "next/link";
import { RegistrationForm, type WindowInfo } from "@/components/RegistrationForm";
import { getEventSettings, getTickets } from "@/lib/content";
import { formatLagos, formatLagosDate, ticketStatus } from "@/lib/tickets";
import { dbConfigured } from "@/lib/db";
import { paystackConfigured } from "@/lib/paystack";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Register", description: "Register for Accelerators Events 2026, Saturday 5 December 2026, Ibadan.", alternates: { canonical: "/events/register" }, robots: { index: false } };

export default async function RegisterPage() {
  const [tickets, event] = await Promise.all([getTickets(), getEventSettings()]);
  const now = new Date();
  const open = tickets.find((t) => ticketStatus(t, now) === "on_sale");
  const next = tickets.find((t) => ticketStatus(t, now) === "upcoming");
  const win: WindowInfo | null = open
    ? { name: open.name, open: true, statusLabel: open.salesEnd ? `Open until ${formatLagos(open.salesEnd)}` : "Open now" }
    : next ? { name: next.name, open: false, statusLabel: `${next.name} opens ${formatLagos(next.salesStart)}.` } : null;
  const saveReady = dbConfigured();

  return (
    <section className="bg-cream pb-24 pt-32 md:pt-44">
      <div className="container-x grid gap-14 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <p className="eyebrow">Registration</p>
          <h1 className="display-lg mt-5 text-navy">{event.name}</h1>
          <p className="mt-4 font-display text-xl text-navy">{formatLagosDate(event.startsAt, true)}{event.city ? ` · ${event.city}` : ""}</p>
          {open && <p className="mt-6 inline-block bg-red px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white">{open.name} open{open.salesEnd ? ` until ${formatLagosDate(open.salesEnd)}` : ""}</p>}
          <ol className="mt-10 space-y-4 text-sm">
            {["Choose your membership position", "Enter your details", "Review your registration", "Pay by bank transfer", "Get confirmed by the team"].map((s, i) => (
              <li key={s} className="flex items-center gap-4"><span className="flex h-8 w-8 shrink-0 items-center justify-center bg-navy text-xs font-semibold text-white">{i + 1}</span>{s}</li>
            ))}
          </ol>
          <p className="mt-10 text-sm text-slate">Pay only into the official account shown during registration. Never send money to an account shared any other way.</p>
        </aside>
        <div className="lg:col-span-7 lg:col-start-6">
          <div className="bg-white p-6 shadow-[0_30px_60px_-40px_rgba(11,30,63,.45)] sm:p-10">
            <RegistrationForm window={win} saveReady={saveReady} cardReady={saveReady && paystackConfigured()} officialFormUrl={site.googleFormUrl} />
          </div>
          <p className="mt-6 text-center text-xs text-slate">Need help? <Link href="/contact?topic=Event%20enquiry" className="underline">Contact the events team</Link>.</p>
        </div>
      </div>
    </section>
  );
}
