import { NextResponse } from "next/server";
import { settlePayment } from "@/lib/flutterwave";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

/** Where Flutterwave sends the member back after paying. Re-checks the payment, then shows the result. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const txRef = url.searchParams.get("tx_ref");
  const transactionId = url.searchParams.get("transaction_id");
  const cancelled = url.searchParams.get("status") === "cancelled";
  const base = env.siteUrl.startsWith("http://localhost") ? url.origin : env.siteUrl;
  if (!txRef || !/^MX-[A-Za-z0-9-]{8,60}$/.test(txRef)) return NextResponse.redirect(`${base}/payments/result`);
  if (!cancelled) {
    try { await settlePayment({ txRef, transactionId }); } catch (e) { console.error("[flutterwave-return]", e); }
  }
  return NextResponse.redirect(`${base}/payments/result?ref=${encodeURIComponent(txRef)}${cancelled ? "&cancelled=1" : ""}`);
}
