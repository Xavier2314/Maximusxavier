import { createHmac, timingSafeEqual } from "node:crypto";
import { after, NextResponse, type NextRequest } from "next/server";
import { handleInbound } from "@/lib/followup";
import type { Prospect } from "@/lib/prospects";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Meta calls this once with a challenge when the webhook is registered. */
export function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams;
  if (q.get("hub.mode") === "subscribe" && process.env.WHATSAPP_VERIFY_TOKEN && q.get("hub.verify_token") === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

type Incoming = { from: string; id: string; type: string; text?: { body: string }; button?: { text: string }; interactive?: { button_reply?: { title: string } } };

/** Incoming WhatsApp messages from prospects. Signed by Meta with the app secret. */
export async function POST(request: NextRequest) {
  const secret = process.env.WHATSAPP_APP_SECRET;
  const raw = await request.text();
  if (!secret) return NextResponse.json({ error: "Not configured" }, { status: 503 });
  const expected = `sha256=${createHmac("sha256", secret).update(raw).digest("hex")}`;
  const got = request.headers.get("x-hub-signature-256") ?? "";
  if (got.length !== expected.length || !timingSafeEqual(Buffer.from(got), Buffer.from(expected))) {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 });
  }
  const payload = JSON.parse(raw) as { entry?: { changes?: { value?: { messages?: Incoming[] } }[] }[] };
  const messages = (payload.entry ?? []).flatMap((e) => (e.changes ?? []).flatMap((c) => c.value?.messages ?? []));

  // Reply to Meta immediately; process (and let the AI answer) after the response.
  after(async () => {
    const admin = createAdminClient();
    for (const m of messages) {
      const text = m.text?.body ?? m.button?.text ?? m.interactive?.button_reply?.title;
      if (!text) continue;
      const { data } = await admin.from("prospects").select("*").eq("phone", m.from.replace(/[^0-9]/g, ""))
        .eq("channel", "whatsapp").order("last_contacted_at", { ascending: false, nullsFirst: false }).limit(1).maybeSingle<Prospect>();
      if (data) await handleInbound(admin, data, text, m.id);
    }
  });
  return NextResponse.json({ ok: true });
}
