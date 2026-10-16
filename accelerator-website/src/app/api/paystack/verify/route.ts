import { NextResponse, type NextRequest } from "next/server";
import { dbConfigured } from "@/lib/db";
import { paystackConfigured } from "@/lib/paystack";
import { confirmPayment } from "@/lib/registrations";

export const dynamic = "force-dynamic";

/** Server-side verification. Returns only the state and reference, never personal data. */
export async function GET(req: NextRequest) {
  const reference = req.nextUrl.searchParams.get("reference");
  if (!reference || !/^ACC26-[A-Z0-9]{8}$/.test(reference)) return NextResponse.json({ state: "invalid" }, { status: 400 });
  if (!dbConfigured() || !paystackConfigured()) return NextResponse.json({ state: "unavailable" }, { status: 503 });
  const r = await confirmPayment(reference);
  return NextResponse.json({ state: r.state, reference });
}
