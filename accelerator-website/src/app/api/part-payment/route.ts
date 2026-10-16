import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { POSITIONS } from "@/lib/fees";

export const dynamic = "force-dynamic";

const schema = z.object({
  ref: z.string().regex(/^PP-\d{8}-[A-Z0-9]{3,6}$/),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(7).max(30),
  email: z.string().trim().max(160).optional().default(""),
  position: z.enum(POSITIONS.map((p) => p.name) as [string, ...string[]]),
  feeNaira: z.number().int().positive(),
  paidNaira: z.number().nonnegative(),
  balanceNaira: z.number().positive(),
  receipts: z.number().int().min(1).max(20),
  balanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  signedAt: z.string().max(40),
});

/**
 * Records a part-payment commitment in the organisers' Google Sheet.
 * PART_PAYMENT_SHEET_URL is the Google Apps Script web-app URL (see docs/part-payment-sheet.md);
 * PART_PAYMENT_SHEET_SECRET must match the SECRET in that script. Both are set in Vercel, never in code.
 */
export async function POST(req: NextRequest) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ saved: false, message: "Invalid details." }, { status: 422 });
  const p = parsed.data;
  const fee = POSITIONS.find((x) => x.name === p.position)!.feeKobo / 100;
  if (p.feeNaira !== fee || p.paidNaira >= fee) return NextResponse.json({ saved: false, message: "Invalid amounts." }, { status: 422 });

  const url = process.env.PART_PAYMENT_SHEET_URL;
  if (!url) return NextResponse.json({ saved: false, message: "Sheet not connected yet." });
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret: process.env.PART_PAYMENT_SHEET_SECRET ?? "", ...p, balanceNaira: fee - p.paidNaira }),
      redirect: "follow",
      cache: "no-store",
    });
    const out = await res.json().catch(() => null);
    return NextResponse.json({ saved: Boolean(res.ok && out?.ok) });
  } catch (e) {
    console.error("[part-payment] sheet write failed", e);
    return NextResponse.json({ saved: false });
  }
}
