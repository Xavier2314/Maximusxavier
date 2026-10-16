import "server-only";
import crypto from "node:crypto";
import { db } from "./db";
import { verifyTransaction } from "./paystack";
import { sendEmail, confirmationEmail } from "./email";
import { getEventSettings, getTicket } from "./content";
import { formatLagos, formatLagosDate, formatNaira } from "./tickets";
import { positionById } from "./fees";

export type Registration = {
  id: string; reference: string; ticket_id: string; full_name: string; email: string; phone: string; city: string | null;
  position: string | null; payment_method: string; extra: Record<string, unknown> | null; organisation: string | null; referral_source: string | null; notes: string | null;
  amount_kobo: number; currency: string; status: "awaiting_payment" | "awaiting_verification" | "pending" | "paid" | "failed" | "abandoned" | "rejected" | "duplicate_paid";
  paid_at: string | null; channel: string | null; gateway_response: string | null; confirmation_sent_at: string | null; created_at: string;
};

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function newReference() {
  const bytes = crypto.randomBytes(8);
  let s = "";
  for (const b of bytes) s += ALPHABET[b % ALPHABET.length];
  return `ACC26-${s}`;
}

export async function getRegistration(reference: string): Promise<Registration | null> {
  const { data } = await db().from("registrations").select("*").eq("reference", reference).maybeSingle();
  return (data as Registration) ?? null;
}

export async function hasPaidRegistration(email: string) {
  const { count } = await db().from("registrations").select("id", { count: "exact", head: true }).eq("email", email.toLowerCase()).eq("status", "paid");
  return (count ?? 0) > 0;
}

export type ConfirmResult =
  | { state: "not_found" }
  | { state: "paid"; registration: Registration }
  | { state: "pending"; registration: Registration }
  | { state: "failed"; registration: Registration }
  | { state: "duplicate"; registration: Registration }
  | { state: "error"; registration: Registration };

/**
 * Verifies a payment with Paystack (server-to-server) and confirms the registration.
 * Safe to call any number of times, from the status page, the verify endpoint or the webhook:
 * the conditional update only succeeds once, so the confirmation email is sent once.
 */
export async function confirmPayment(reference: string): Promise<ConfirmResult> {
  const reg = await getRegistration(reference);
  if (!reg) return { state: "not_found" };
  if (reg.status === "paid") return { state: "paid", registration: reg };
  if (reg.status === "duplicate_paid") return { state: "duplicate", registration: reg };

  const tx = await verifyTransaction(reference);
  if (!tx) return { state: "error", registration: reg };

  if (tx.status === "success") {
    if (tx.amount !== reg.amount_kobo || tx.currency !== reg.currency) {
      await db().from("registrations").update({ status: "failed", gateway_response: `Amount mismatch: got ${tx.amount} ${tx.currency}`, updated_at: new Date().toISOString() }).eq("reference", reference).neq("status", "paid");
      return { state: "failed", registration: { ...reg, status: "failed" } };
    }
    const { data, error } = await db()
      .from("registrations")
      .update({ status: "paid", paid_at: tx.paidAt ?? new Date().toISOString(), channel: tx.channel, gateway_response: tx.gatewayResponse, updated_at: new Date().toISOString() })
      .eq("reference", reference)
      .in("status", ["pending", "failed", "abandoned"])
      .select("*")
      .maybeSingle();

    if (error) {
      // Unique index violation: this email already has a confirmed registration. Flag for refund review.
      if (error.code === "23505") {
        await db().from("registrations").update({ status: "duplicate_paid", paid_at: tx.paidAt, channel: tx.channel, gateway_response: "Duplicate payment - review for refund", updated_at: new Date().toISOString() }).eq("reference", reference);
        const dup = await getRegistration(reference);
        return { state: "duplicate", registration: dup ?? reg };
      }
      return { state: "error", registration: reg };
    }

    const fresh = (data as Registration | null) ?? (await getRegistration(reference)) ?? reg;
    if (data) await sendConfirmation(fresh);
    return { state: "paid", registration: fresh };
  }

  if (tx.status === "failed" || tx.status === "abandoned") {
    await db().from("registrations").update({ status: tx.status, gateway_response: tx.gatewayResponse, updated_at: new Date().toISOString() }).eq("reference", reference).eq("status", "pending");
    return { state: "failed", registration: { ...reg, status: tx.status } };
  }
  return { state: "pending", registration: reg };
}

export async function sendConfirmation(reg: Registration) {
  const [event, ticket] = await Promise.all([getEventSettings(), getTicket(reg.ticket_id)]);
  const where = [event.venueName, event.city].filter(Boolean).join(", ") || null;
  const ok = await sendEmail(
    reg.email,
    `Registration confirmed: ${event.name} (${reg.reference})`,
    confirmationEmail({
      name: reg.full_name, reference: reg.reference, ticket: [positionById(reg.position ?? "")?.name, ticket?.name].filter(Boolean).join(" \u00b7 ") || reg.ticket_id,
      amount: formatNaira(reg.amount_kobo) ?? "", eventName: event.name, eventWhen: event.timeConfirmed ? formatLagos(event.startsAt) : formatLagosDate(event.startsAt, true), eventWhere: where,
    }),
  );
  if (ok) await db().from("registrations").update({ confirmation_sent_at: new Date().toISOString() }).eq("reference", reg.reference);
}
