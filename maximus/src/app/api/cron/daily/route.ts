import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron-auth";
import { dispatchPendingPush } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily job (Vercel Cron, 06:00 UTC = 07:00 in Lagos):
 * evaluation reminders, goal-setting reminders (10th–15th), birthdays,
 * anniversaries, the Monday "your focus this week" message — then delivers
 * any queued push notifications.
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
  let growthFocus: number | null = null;
  if (new Date(`${today}T12:00:00Z`).getUTCDay() === 1) {
    const { data, error: focusError } = await admin.rpc("run_weekly_growth_focus");
    if (focusError) return NextResponse.json({ error: focusError.message }, { status: 500 });
    growthFocus = data as number;
  }
  const push = await dispatchPendingPush(1000);
  return NextResponse.json({ ok: true, reminders, growthFocus, push });
}
