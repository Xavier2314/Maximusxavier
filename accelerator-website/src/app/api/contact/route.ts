import { NextResponse, type NextRequest } from "next/server";
import { contactSchema, fieldErrors } from "@/lib/validation";
import { db, dbConfigured } from "@/lib/db";
import { sendEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const errs = fieldErrors(parsed.error);
    if (errs.website) return NextResponse.json({ ok: true }); // honeypot filled: pretend success
    return NextResponse.json({ message: "Please correct the highlighted fields.", errors: errs }, { status: 422 });
  }
  const m = parsed.data;
  if (Date.now() - m.startedAt < 3000) return NextResponse.json({ ok: true }); // submitted too fast: likely a bot

  let stored = false;
  if (dbConfigured()) {
    const { error } = await db().from("contact_messages").insert({ name: m.name, email: m.email, phone: m.phone || null, topic: m.topic, message: m.message });
    stored = !error;
    if (error) console.error("[contact] insert failed", error);
  }
  const to = process.env.CONTACT_TO_EMAIL;
  const mailed = to
    ? await sendEmail(to, `[Website] ${m.topic} from ${m.name}`, `<p><b>${esc(m.name)}</b> &lt;${esc(m.email)}&gt; ${esc(m.phone ?? "")}</p><p><b>${esc(m.topic)}</b></p><p style="white-space:pre-line">${esc(m.message)}</p>`)
    : false;

  if (!stored && !mailed) {
    return NextResponse.json({ message: "Messages cannot be received yet while the site is being set up. Please try again soon." }, { status: 503 });
  }
  return NextResponse.json({ ok: true });
}
