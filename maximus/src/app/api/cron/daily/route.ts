import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { dispatchPendingPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily job (Vercel Cron, 06:00 UTC = 07:00 in Lagos):
 * evaluation reminders, goal-setting reminders (10th–15th), birthdays,
 * anniversaries — then delivers any queued push notifications.
 */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" }, { status: 503 });
  }
  const admin = createAdminClient();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date());
  const { data: reminders, error } = await admin.rpc("run_daily_reminders", { p_today: today });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const push = await dispatchPendingPush(1000);
  return NextResponse.json({ ok: true, reminders, push });
}
