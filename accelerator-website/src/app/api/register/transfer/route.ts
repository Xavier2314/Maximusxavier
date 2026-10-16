import { NextResponse, type NextRequest } from "next/server";
import { transferConfirmSchema, fieldErrors } from "@/lib/validation";
import { db, dbConfigured } from "@/lib/db";

export const dynamic = "force-dynamic";

/** The attendee says they have paid by bank transfer. An admin verifies it before the place is confirmed. */
export async function POST(req: NextRequest) {
  if (!dbConfigured()) return NextResponse.json({ message: "Registration is being set up." }, { status: 503 });
  const parsed = transferConfirmSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ message: "Please check the details.", errors: fieldErrors(parsed.error) }, { status: 422 });
  const { reference, senderName, senderBank } = parsed.data;
  const { data, error } = await db()
    .from("registrations")
    .update({ status: "awaiting_verification", extra: { transfer: { senderName, senderBank: senderBank || null, reportedAt: new Date().toISOString() } }, updated_at: new Date().toISOString() })
    .eq("reference", reference)
    .in("status", ["awaiting_payment", "awaiting_verification"])
    .select("reference")
    .maybeSingle();
  if (error || !data) return NextResponse.json({ message: "We could not find a registration waiting for payment with that reference." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
