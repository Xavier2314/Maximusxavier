import { NextResponse } from "next/server";
import { isAuthorizedDispatch } from "@/lib/cron-auth";
import { dispatchPendingPush } from "@/lib/push";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends queued web-push notifications. Call it from a Supabase Database
 * Webhook on `notifications` INSERT (with header Authorization: Bearer
 * CRON_SECRET) for near-instant delivery; the daily cron also sweeps it.
 */
export async function POST(request: Request) {
  if (!isAuthorizedDispatch(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await dispatchPendingPush();
  return NextResponse.json(result);
}
