import { NextResponse, type NextRequest } from "next/server";
import { db, dbConfigured } from "@/lib/db";
import { validWebhookSignature } from "@/lib/paystack";
import { confirmPayment } from "@/lib/registrations";

export const dynamic = "force-dynamic";

/**
 * Paystack webhook. Set the URL in Paystack: Settings > API Keys & Webhooks >
 * https://<your-domain>/api/paystack/webhook
 * The signature is checked against the raw body. Every event is still re-verified with the
 * Paystack API before a registration is confirmed, and confirmation is idempotent.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!validWebhookSignature(raw, req.headers.get("x-paystack-signature"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  let evt: { event?: string; data?: { reference?: string } } = {};
  try { evt = JSON.parse(raw); } catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  if (dbConfigured()) {
    await db().from("payment_events").insert({ reference: evt.data?.reference ?? null, event: evt.event ?? "unknown", payload: evt });
    if (evt.event === "charge.success" && evt.data?.reference) await confirmPayment(evt.data.reference);
  }
  return NextResponse.json({ ok: true });
}
