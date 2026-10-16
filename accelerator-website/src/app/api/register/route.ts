import { NextResponse, type NextRequest } from "next/server";
import { registrationSchema, fieldErrors } from "@/lib/validation";
import { db, dbConfigured } from "@/lib/db";
import { initializeTransaction, paystackConfigured } from "@/lib/paystack";
import { getTickets } from "@/lib/content";
import { ticketStatus } from "@/lib/tickets";
import { positionById } from "@/lib/fees";
import { hasPaidRegistration, newReference } from "@/lib/registrations";
import { site } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!dbConfigured()) {
    return NextResponse.json({ message: "Online registration is being set up. Please use the official registration form for now." }, { status: 503 });
  }
  const body = await req.json().catch(() => null);
  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ message: "Please correct the highlighted fields.", errors: fieldErrors(parsed.error) }, { status: 422 });
  const input = parsed.data;

  // The registration window (Early Bird / Late) is decided by the server clock, never the browser.
  const tickets = await getTickets();
  const window = tickets.find((t) => ticketStatus(t, new Date()) === "on_sale");
  if (!window) return NextResponse.json({ message: "Registration is not open right now." }, { status: 409 });

  const position = positionById(input.position);
  if (!position) return NextResponse.json({ message: "Choose a valid membership position." }, { status: 422 });
  const amountKobo = position.feeKobo;

  if (await hasPaidRegistration(input.email)) {
    return NextResponse.json({ message: "This email address already has a confirmed registration. Contact us if you need help." }, { status: 409 });
  }

  const card = input.method === "card" && paystackConfigured();
  const reference = newReference();
  const { error } = await db().from("registrations").insert({
    reference, ticket_id: window.id, position: position.id, payment_method: card ? "card" : "bank_transfer",
    full_name: input.fullName, email: input.email, phone: input.phone, city: input.city,
    organisation: input.organisation || null, referral_source: input.referralSource, notes: input.notes || null,
    consent: true, amount_kobo: amountKobo, currency: "NGN", status: card ? "pending" : "awaiting_payment",
  });
  if (error) {
    console.error("[register] insert failed", error);
    return NextResponse.json({ message: "We could not save your registration. Please try again." }, { status: 500 });
  }

  if (!card) return NextResponse.json({ reference, amountKobo });

  const origin = process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin ?? site.url;
  try {
    const { authorizationUrl, accessCode } = await initializeTransaction({
      email: input.email, amountKobo, reference,
      callbackUrl: `${origin}/events/register/status?reference=${encodeURIComponent(reference)}`,
      metadata: { reference, position: position.id, full_name: input.fullName, phone: input.phone },
    });
    await db().from("registrations").update({ paystack_access_code: accessCode }).eq("reference", reference);
    return NextResponse.json({ authorizationUrl, reference });
  } catch (e) {
    console.error("[register] paystack init failed", e);
    await db().from("registrations").update({ status: "failed", gateway_response: "Initialisation failed" }).eq("reference", reference);
    return NextResponse.json({ message: "We could not connect to the payment provider. Please try again or pay by bank transfer." }, { status: 502 });
  }
}
