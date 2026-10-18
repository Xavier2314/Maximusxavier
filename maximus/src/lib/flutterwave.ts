import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Flutterwave (v3 API): hosted payment page for card, bank transfer and USSD.
 * Every payment is re-checked with Flutterwave on the server before it's applied;
 * the browser redirect and the webhook are only hints that something happened.
 */
const BASE = "https://api.flutterwave.com/v3";

const secretKey = () => process.env.FLUTTERWAVE_SECRET_KEY ?? "";
export const isFlutterwaveConfigured = () => secretKey().startsWith("FLWSECK");

async function flw<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const json = (await res.json().catch(() => null)) as T | null;
  if (!res.ok || !json) throw new Error(`Flutterwave ${path} failed (${res.status})`);
  return json;
}

export async function createCheckout(input: {
  txRef: string; amount: number; email: string; name: string; phone?: string | null; title: string; description: string; redirectUrl: string;
}): Promise<string> {
  const json = await flw<{ status: string; data?: { link?: string } }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amount,
      currency: "NGN",
      redirect_url: input.redirectUrl,
      payment_options: "card,banktransfer,ussd",
      customer: { email: input.email, name: input.name, phonenumber: input.phone ?? undefined },
      customizations: { title: input.title, description: input.description },
    }),
  });
  if (json.status !== "success" || !json.data?.link) throw new Error("Flutterwave did not return a payment link");
  return json.data.link;
}

type FlwTransaction = { id: number; tx_ref: string; status: string; amount: number; charged_amount?: number; currency: string };

async function verifyById(id: string | number) {
  const json = await flw<{ status: string; data?: FlwTransaction }>(`/transactions/${encodeURIComponent(String(id))}/verify`);
  return json.status === "success" ? json.data ?? null : null;
}

async function verifyByRef(txRef: string) {
  const json = await flw<{ status: string; data?: FlwTransaction }>(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`);
  return json.status === "success" ? json.data ?? null : null;
}

/** Re-check a payment with Flutterwave and apply it. Safe to call more than once. */
export async function settlePayment(opts: { txRef?: string | null; transactionId?: string | number | null }) {
  const tx = opts.transactionId ? await verifyById(opts.transactionId) : opts.txRef ? await verifyByRef(opts.txRef) : null;
  if (!tx) return { result: "not_found" as const, txRef: opts.txRef ?? null };
  if (opts.txRef && tx.tx_ref !== opts.txRef) return { result: "mismatch" as const, txRef: opts.txRef };
  if (!tx.tx_ref?.startsWith("MX-")) return { result: "ignored" as const, txRef: tx.tx_ref };
  if (tx.status !== "successful" && tx.status !== "failed") return { result: "pending" as const, txRef: tx.tx_ref };
  const { data, error } = await createAdminClient().rpc("apply_online_payment", {
    p_tx_ref: tx.tx_ref, p_provider_id: tx.id, p_paid: Number(tx.amount), p_currency: tx.currency, p_successful: tx.status === "successful",
  });
  if (error) throw new Error(`apply_online_payment: ${error.message}`);
  return { result: String(data), txRef: tx.tx_ref };
}
