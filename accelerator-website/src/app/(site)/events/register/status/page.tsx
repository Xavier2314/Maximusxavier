import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert, CircleCheck, Clock3, CircleX } from "lucide-react";
import { dbConfigured } from "@/lib/db";
import { paystackConfigured } from "@/lib/paystack";
import { confirmPayment } from "@/lib/registrations";
import { getEventSettings, getTicket } from "@/lib/content";
import { formatLagos, formatNaira } from "@/lib/tickets";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Registration status", robots: { index: false, follow: false } };

function Shell({ icon, eyebrow, title, children }: { icon: React.ReactNode; eyebrow: string; title: string; children: React.ReactNode }) {
  return (
    <section className="bg-cream pb-24 pt-32 md:pt-44">
      <div className="container-x max-w-3xl">
        <div className="bg-white p-8 shadow-[0_30px_60px_-40px_rgba(11,30,63,.45)] md:p-14">
          {icon}
          <p className="eyebrow mt-8">{eyebrow}</p>
          <h1 className="display-md mt-4 text-navy">{title}</h1>
          <div className="mt-6 space-y-4 text-ink/80">{children}</div>
        </div>
      </div>
    </section>
  );
}

export default async function StatusPage({ searchParams }: { searchParams: Promise<{ reference?: string; trxref?: string }> }) {
  const sp = await searchParams;
  const reference = (sp.reference ?? sp.trxref ?? "").trim();

  if (!reference || !/^ACC26-[A-Z0-9]{8}$/.test(reference)) {
    return <Shell icon={<TriangleAlert className="text-gold" size={44} />} eyebrow="Registration" title="We could not find that registration.">
      <p>The link is missing a valid registration reference. If you were charged, contact us with your payment receipt.</p>
      <Link href="/contact?topic=Event%20enquiry" className="btn btn-navy mt-4">Contact the events team</Link>
    </Shell>;
  }
  if (!dbConfigured() || !paystackConfigured()) {
    return <Shell icon={<Clock3 className="text-royal" size={44} />} eyebrow="Registration" title="Verification is temporarily unavailable.">
      <p>Please check back shortly. Your reference is <b>{reference}</b>.</p>
    </Shell>;
  }

  // Never trust the redirect: always verify with Paystack on the server.
  const r = await confirmPayment(reference);

  if (r.state === "paid") {
    const [ticket, event] = await Promise.all([getTicket(r.registration.ticket_id), getEventSettings()]);
    return <Shell icon={<CircleCheck className="text-royal" size={48} />} eyebrow="Payment verified" title={`You're registered, ${r.registration.full_name.split(" ")[0]}.`}>
      <p>Your payment was verified and your place at <b>{event.name}</b> is confirmed. {r.registration.confirmation_sent_at ? `A confirmation email was sent to ${r.registration.email}.` : "Save this page or take a screenshot for your records."}</p>
      <dl className="mt-6 divide-y divide-sand border-y border-sand text-sm">
        {([["Reference", r.registration.reference], ["Ticket", ticket?.name ?? r.registration.ticket_id], ["Amount", formatNaira(r.registration.amount_kobo) ?? ""], ["Paid", formatLagos(r.registration.paid_at) ?? ""]] as const).map(([k, v]) => (
          <div key={k} className="grid grid-cols-3 py-3"><dt className="text-slate">{k}</dt><dd className="col-span-2 font-semibold text-navy">{v}</dd></div>
        ))}
      </dl>
      <p className="text-sm text-slate">Keep your reference. You will need it at check-in.</p>
      <Link href="/events" className="btn btn-navy mt-4">Back to the event</Link>
    </Shell>;
  }
  if (r.state === "pending" || r.state === "error") {
    return <Shell icon={<Clock3 className="text-royal" size={44} />} eyebrow="Verifying payment" title="We're still confirming your payment.">
      <p>This can take a minute. Your reference is <b>{reference}</b>. Refresh this page shortly; we will also confirm automatically when Paystack notifies us.</p>
      <Link href={`/events/register/status?reference=${reference}`} className="btn btn-navy mt-4">Check again</Link>
    </Shell>;
  }
  if (r.state === "duplicate") {
    return <Shell icon={<TriangleAlert className="text-gold" size={44} />} eyebrow="Already registered" title="This email was already registered.">
      <p>We received a second payment (reference <b>{reference}</b>) for an email that already has a confirmed place. Our team will review it for a refund. Please contact us if you have questions.</p>
      <Link href="/contact?topic=Event%20enquiry" className="btn btn-navy mt-4">Contact us</Link>
    </Shell>;
  }
  if (r.state === "failed") {
    return <Shell icon={<CircleX className="text-red" size={44} />} eyebrow="Payment not completed" title="Your payment did not go through.">
      <p>No registration was confirmed for reference <b>{reference}</b>. You can try again; you will not be charged twice for a failed attempt.</p>
      <Link href="/events/register" className="btn btn-red mt-4">Try again</Link>
    </Shell>;
  }
  return <Shell icon={<TriangleAlert className="text-gold" size={44} />} eyebrow="Registration" title="We could not find that registration.">
    <p>No registration matches <b>{reference}</b>. If you were charged, contact us with your payment receipt.</p>
    <Link href="/contact?topic=Event%20enquiry" className="btn btn-navy mt-4">Contact us</Link>
  </Shell>;
}
