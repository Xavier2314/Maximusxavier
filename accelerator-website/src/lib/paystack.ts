import "server-only";
import crypto from "node:crypto";

const BASE = "https://api.paystack.co";

export function paystackConfigured() {
  return Boolean(process.env.PAYSTACK_SECRET_KEY);
}

function headers() {
  return { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" };
}

export async function initializeTransaction(input: {
  email: string; amountKobo: number; reference: string; callbackUrl: string; metadata: Record<string, unknown>;
}): Promise<{ authorizationUrl: string; accessCode: string }> {
  const res = await fetch(`${BASE}/transaction/initialize`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      email: input.email,
      amount: input.amountKobo,
      currency: "NGN",
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,
    }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status) throw new Error(json?.message ?? "Paystack initialisation failed");
  return { authorizationUrl: json.data.authorization_url, accessCode: json.data.access_code };
}

export type VerifiedTransaction = {
  status: "success" | "failed" | "abandoned" | "pending" | string;
  amount: number;
  currency: string;
  reference: string;
  paidAt: string | null;
  channel: string | null;
  gatewayResponse: string | null;
};

export async function verifyTransaction(reference: string): Promise<VerifiedTransaction | null> {
  const res = await fetch(`${BASE}/transaction/verify/${encodeURIComponent(reference)}`, { headers: headers(), cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (!res.ok || !json?.status || !json.data) return null;
  const d = json.data;
  return {
    status: d.status, amount: d.amount, currency: d.currency, reference: d.reference,
    paidAt: d.paid_at ?? d.paidAt ?? null, channel: d.channel ?? null, gatewayResponse: d.gateway_response ?? null,
  };
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
export function validWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature || !process.env.PAYSTACK_SECRET_KEY) return false;
  const hash = crypto.createHmac("sha512", process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest("hex");
  const a = Buffer.from(hash);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
