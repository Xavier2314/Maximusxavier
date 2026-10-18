import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { isFlutterwaveConfigured, settlePayment } from "@/lib/flutterwave";

export const dynamic = "force-dynamic";

function sameSecret(a: string, b: string) {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Flutterwave calls this when a payment changes. We only trust it after re-checking with Flutterwave. */
export async function POST(request: Request) {
  const expected = process.env.FLUTTERWAVE_WEBHOOK_HASH ?? "";
  const got = request.headers.get("verif-hash") ?? "";
  if (!expected || !got || !sameSecret(got, expected)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isFlutterwaveConfigured()) return NextResponse.json({ error: "Not configured" }, { status: 503 });

  const body = (await request.json().catch(() => null)) as { event?: string; data?: { id?: number; tx_ref?: string } } | null;
  const data = body?.data;
  if (!data?.id && !data?.tx_ref) return NextResponse.json({ ok: true, ignored: true });
  try {
    const r = await settlePayment({ transactionId: data.id ?? null, txRef: data.tx_ref ?? null });
    return NextResponse.json({ ok: true, result: r.result });
  } catch (e) {
    console.error("[flutterwave-webhook]", e);
    // A 500 makes Flutterwave retry later.
    return NextResponse.json({ error: "Could not process" }, { status: 500 });
  }
}
