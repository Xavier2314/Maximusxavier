import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Info } from "lucide-react";
import { RegistrationForm, type TicketOption } from "@/components/RegistrationForm";
import { getEventSettings, getTickets } from "@/lib/content";
import { canPurchase, formatLagos, formatNaira, ticketStatus } from "@/lib/tickets";
import { dbConfigured } from "@/lib/db";
import { paystackConfigured } from "@/lib/paystack";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Register", description: "Register and pay for Accelerators Events 2026.", alternates: { canonical: "/events/register" }, robots: { index: false } };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const [{ ticket }, tickets, event] = await Promise.all([searchParams, getTickets(), getEventSettings()]);
  const now = new Date();
  const options: TicketOption[] = tickets.map((t) => {
    const s = ticketStatus(t, now);
    return {
      id: t.id, name: t.name, price: formatNaira(t.priceKobo),
      purchasable: s === "on_sale",
      statusLabel: s === "on_sale" ? (t.salesEnd ? `Open until ${formatLagos(t.salesEnd)}` : "Open now") : s === "upcoming" ? `Opens ${formatLagos(t.salesStart)}` : s === "ended" ? "Closed" : "Unavailable",
    };
  });
  const paymentsReady = dbConfigured() && paystackConfigured() && tickets.some((t) => canPurchase(t, now));

  return (
    <section className="bg-cream pb-24 pt-32 md:pt-44">
      <div className="container-x grid gap-14 lg:grid-cols-12">
        <aside className="lg:col-span-4">
          <p className="eyebrow">Registration</p>
          <h1 className="display-lg mt-5 text-navy">{event.name}</h1>
          <p className="mt-6 text-ink/75">Fill in your details, review them, then pay securely with Paystack. You will receive a unique registration reference once your payment is verified.</p>
          <ol className="mt-10 space-y-4 text-sm">
            {["Choose your ticket", "Enter your details", "Review your registration", "Pay securely with Paystack", "Receive your confirmation"].map((s, i) => (
              <li key={s} className="flex items-center gap-4"><span className="flex h-8 w-8 items-center justify-center bg-navy text-xs font-semibold text-white">{i + 1}</span>{s}</li>
            ))}
          </ol>
          <div className="mt-10 border-l-4 border-gold bg-white p-5 text-sm">
            <p className="flex items-center gap-2 font-semibold text-navy"><Info size={16} aria-hidden="true" /> Draft form</p>
            <p className="mt-2 text-slate">This form is a draft until the official registration questions are confirmed. The current official form is still available:</p>
            <a href={site.googleFormUrl} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-2 font-semibold text-royal underline-offset-4 hover:underline">Open the official Google Form <ExternalLink size={14} aria-hidden="true" /></a>
          </div>
        </aside>
        <div className="lg:col-span-7 lg:col-start-6">
          <div className="bg-white p-6 shadow-[0_30px_60px_-40px_rgba(11,30,63,.45)] sm:p-10">
            {!paymentsReady && (
              <p className="mb-8 border-l-4 border-royal bg-royal/5 px-4 py-3 text-sm text-navy">
                Online payment is being set up. You can fill in and review the form now; payment opens once the ticket price and payment account are confirmed.
              </p>
            )}
            <RegistrationForm tickets={options} initialTicket={ticket} paymentsReady={paymentsReady} />
          </div>
          <p className="mt-6 text-center text-xs text-slate">Need help? <Link href="/contact?topic=Event%20enquiry" className="underline">Contact the events team</Link>.</p>
        </div>
      </div>
    </section>
  );
}
