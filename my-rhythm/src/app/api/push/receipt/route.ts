import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyReminderToken } from "@/lib/push/token";
import { createAdminClient } from "@/lib/supabase/admin";

const Input = z.object({ token: z.string().max(500), event: z.enum(["received", "clicked"]), endpoint: z.string().max(2000).optional() });

/**
 * Called by the service worker when a push arrives / is tapped. Authenticated
 * by the signed token in the push payload. This proves the DEVICE's service
 * worker received the message and asked the OS to show it — it cannot prove
 * the alert was audible (Focus/silent mode are outside the app's control).
 */
export async function POST(req: Request) {
  try {
    const input = Input.parse(await req.json());
    const claims = verifyReminderToken(input.token);
    if (!claims) return NextResponse.json({ error: "invalid token" }, { status: 401 });
    const admin = createAdminClient();
    let subscriptionId: string | null = null;
    if (input.endpoint) {
      const { data } = await admin.from("push_subscriptions").select("id").eq("endpoint", input.endpoint).eq("user_id", claims.userId).maybeSingle();
      subscriptionId = data?.id ?? null;
    }
    await admin.from("notification_delivery_logs").insert({ user_id: claims.userId, reminder_id: claims.reminderId, subscription_id: subscriptionId, event: input.event });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
