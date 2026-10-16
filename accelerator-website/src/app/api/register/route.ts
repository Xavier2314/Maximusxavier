import { NextResponse, type NextRequest } from "next/server";
import { registrationSchema, fieldErrors } from "@/lib/validation";
import { db, dbConfigured } from "@/lib/db";
import { initializeTransaction, paystackConfigured } from "@/lib/paystack";
import { getTicket } from "@/lib/content";
import { ticketStatus } from "@/lib/tickets";
import { hasPaidRegistration, newReference } from "@/lib/registrations";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!dbConfigured() || !paystackConfigured()) {
    return NextResponse.json({ message: "Online registration is being set up. Please try again soon or use the official registration form." }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Please correct the highlighted fields.", errors: fieldErrors(parsed.error) }, { status: 422 });
  const input = parsed.data;

  // Server-side sales window check (Africa/Lagos windows stored as absolute instants).
  const ticket = await getTicket(input.ticketId);
  if (!ticket) return NextResponse.json({ message: "That ticket does not exist." }, { status: 404 });
  const status = ticketStatus(ticket, new Date());
  if (status !== "on_sale") {
    const msg = status === "upcoming" ? `${ticket.name} is not open yet.` : status === "ended" ? `${ticket.name} has closed.` : `${ticket.name} is not available.`;
    return NextResponse.json({ message: msg }, { status: 409 });
  }
  if (!ticket.priceKobo || ticket.priceKobo <= 0) {
    return NextResponse.json({ message: "The ticket price has not been confirmed yet. Payment will open soon." }, { status: 409 });
  }
  if (await hasPaidRegistration(input.email)) {
    return NextResponse.json({ message: "This email address already has a confirmed registration. Contact us if you need help." }, { status: 409 });
  }

  const reference = newReference();
  const { error } = await db().from("registrations").insert({
    reference, ticket_id: ticket.id, full_name: input.fullName, email: input.email, phone: input.phone, city: input.city,
    is_member: input.isMember, organisation: input.organisation || null, referral_source: input.referralSource, notes: input.notes || null,
    consent: true, amount_kobo: ticket.priceKobo, currency: "NGN", status: "pending",
  });
  if (error) {
    console.error("[register] insert failed", error);
    return NextResponse.json({ message: "We could not save your registration. Please try again." }, { status: 500 });
  }

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin ?? site.url;
  try {
    const { authorizationUrl, accessCode } = await initializeTransaction({
      email: input.email, amountKobo: ticket.priceKobo, reference,
      callbackUrl: `${origin}/events/register/status?reference=${encodeURIComponent(reference)}`,
      metadata: { reference, ticket_id: ticket.id, full_name: input.fullName, phone: input.phone },
    });
    await db().from("registrations").update({ paystack_access_code: accessCode }).eq("reference", reference);
    return NextResponse.json({ authorizationUrl, reference });
  } catch (e) {
    console.error("[register] paystack init failed", e);
    await db().from("registrations").update({ status: "failed", gateway_response: "Initialisation failed" }).eq("reference", reference);
    return NextResponse.json({ message: "We could not connect to the payment provider. Please try again in a moment." }, { status: 502 });
  }
}
