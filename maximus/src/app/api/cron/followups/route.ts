import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { runAutopilot } from "@/lib/followup";
import { dispatchPendingPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * AI prospect follow-ups (Vercel Cron, 09:00 UTC = 10:00 in Lagos): picks up
 * Gmail replies and sends follow-ups that are due, then delivers push.
 * WhatsApp replies are answered instantly by the webhook instead.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, { status: 503 });
  }
  const prospects = await runAutopilot(createAdminClient());
  const push = await dispatchPendingPush(500);
  return NextResponse.json({ ok: true, prospects, push });
}
