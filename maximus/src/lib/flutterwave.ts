import "server-only";
import { ProxyAgent, fetch as undiciFetch } from "undici";
import { createAdminClient } from "@/lib/supabase/server";

/**
 * Flutterwave (v3 API): hosted payment page for card, bank transfer and USSD.
 * Every payment is re-checked with Flutterwave on the server before it's applied;
 * the browser redirect and the webhook are only hints that something happened.
 */
const BASE = "https://api.flutterwave.com/v3";

// Accepts the name used in this project's Vercel settings ("Secret__key") as well as the standard one.
const secretKey = () => (process.env.FLUTTERWAVE_SECRET_KEY || process.env.Secret__key || "").trim();
export const isFlutterwaveConfigured = () => secretKey().startsWith("FLWSECK");

/**
 * Flutterwave only accepts payout (transfer) calls from whitelisted IP addresses, and
 * Vercel's addresses change. When FLUTTERWAVE_PROXY_URL is set (e.g. a Fixie or QuotaGuard
 * static-IP proxy), transfer and balance calls go through it so they come from fixed IPs.
 */
let proxy: ProxyAgent | null = null;
function needsStaticIp(path: string) {
  return path.startsWith("/transfers") || path.startsWith("/balances");
}
async function flwFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const proxyUrl = process.env.FLUTTERWAVE_PROXY_URL?.trim();
  if (proxyUrl && needsStaticIp(path)) {
    proxy ??= new ProxyAgent(proxyUrl);
    const res = await undiciFetch(`${BASE}${path}`, {
      method: init.method, body: init.body as string | undefined, headers: init.headers as Record<string, string>, dispatcher: proxy,
    });
    return res as unknown as Response;
  }
  return fetch(`${BASE}${path}`, { ...init, cache: "no-store" });
}

async function flw<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await flwFetch(path, {
    ...init,
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json", ...((init?.headers as Record<string, string>) ?? {}) },
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

// ---------------------------------------------------------------------------
// Payouts (transfers to bank accounts)
// ---------------------------------------------------------------------------
export type Bank = { code: string; name: string };

export async function listBanks(): Promise<Bank[]> {
  const res = await fetch(`${BASE}/banks/NG`, { headers: { Authorization: `Bearer ${secretKey()}` }, next: { revalidate: 86400 } });
  const json = (await res.json().catch(() => null)) as { status?: string; data?: { code: string; name: string }[] } | null;
  if (!res.ok || json?.status !== "success" || !json.data) return [];
  return json.data.map((b) => ({ code: b.code, name: b.name })).sort((a, b) => a.name.localeCompare(b.name));
}

/** Ask the bank for the account holder's name before money is sent. */
export async function resolveAccount(accountNumber: string, bankCode: string): Promise<string | null> {
  try {
    const json = await flw<{ status: string; data?: { account_name?: string } }>("/accounts/resolve", {
      method: "POST", body: JSON.stringify({ account_number: accountNumber, account_bank: bankCode }),
    });
    return json.status === "success" ? json.data?.account_name ?? null : null;
  } catch {
    return null;
  }
}

export async function createTransfer(input: { reference: string; bankCode: string; accountNumber: string; amount: number; narration: string }) {
  const res = await flwFetch("/transfers", {
    method: "POST",
    headers: { Authorization: `Bearer ${secretKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      account_bank: input.bankCode, account_number: input.accountNumber, amount: input.amount, currency: "NGN", debit_currency: "NGN",
      narration: input.narration.slice(0, 80), reference: input.reference,
    }),
  });
  const json = (await res.json().catch(() => null)) as { status?: string; message?: string; data?: { id?: number; status?: string } } | null;
  return { ok: res.ok && json?.status === "success", id: json?.data?.id ?? null, status: json?.data?.status ?? null, message: json?.message ?? `HTTP ${res.status}` };
}

/** Re-check a transfer with Flutterwave and settle the payout. Safe to call more than once. */
export async function settleTransfer(opts: { reference: string; transferId?: number | null }) {
  let id = opts.transferId ?? null;
  let status: string | null = null, message: string | null = null;
  if (id) {
    const json = await flw<{ status: string; data?: { id: number; status: string; reference: string; complete_message?: string } }>(`/transfers/${id}`);
    if (json.data?.reference !== opts.reference) return "mismatch";
    status = json.data?.status ?? null; message = json.data?.complete_message ?? null;
  } else {
    const json = await flw<{ status: string; data?: { id: number; status: string; reference: string; complete_message?: string }[] }>(`/transfers?reference=${encodeURIComponent(opts.reference)}`);
    const t = json.data?.find((x) => x.reference === opts.reference);
    if (!t) return "not_found";
    id = t.id; status = t.status; message = t.complete_message ?? null;
  }
  if (status !== "SUCCESSFUL" && status !== "FAILED") return "pending";
  const { data, error } = await createAdminClient().rpc("finish_payout", {
    p_reference: opts.reference, p_success: status === "SUCCESSFUL", p_provider_id: id, p_message: message,
  });
  if (error) throw new Error(`finish_payout: ${error.message}`);
  return String(data);
}

/** Money available in the Flutterwave account for payouts (NGN). */
export async function payoutBalance(): Promise<number | null> {
  try {
    const json = await flw<{ status: string; data?: { available_balance?: number } }>("/balances/NGN");
    return json.status === "success" ? Number(json.data?.available_balance ?? 0) : null;
  } catch {
    return null;
  }
}
