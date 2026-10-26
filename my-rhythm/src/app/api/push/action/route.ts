import { NextResponse } from "next/server";
import { z } from "zod";
import { DateTime } from "luxon";
import { verifyReminderToken } from "@/lib/push/token";
import { createAdminClient } from "@/lib/supabase/admin";
import { performOccurrenceAction } from "@/lib/schedule/actions";
import { syncReminders } from "@/lib/reminders/sync";

const Input = z.object({ token: z.string().max(500), action: z.enum(["snooze", "complete"]), minutes: z.number().int().min(5).max(30).optional() });

/** Notification action buttons (where the platform supports them). Scoped to ONE reminder by signed token. */
export async function POST(req: Request) {
  try {
    const input = Input.parse(await req.json());
    const claims = verifyReminderToken(input.token);
    if (!claims) return NextResponse.json({ error: "invalid token" }, { status: 401 });
    const admin = createAdminClient();
    const { data: r } = await admin.from("scheduled_reminders").select("id,user_id,activity_id,occurrence_date,title,body,url").eq("id", claims.reminderId).eq("user_id", claims.userId).maybeSingle();
    if (!r) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (input.action === "snooze") {
      const fire = DateTime.now().plus({ minutes: input.minutes ?? 10 });
      await admin.from("scheduled_reminders").insert({
        user_id: r.user_id, activity_id: r.activity_id, occurrence_date: r.occurrence_date, kind: "snooze", fire_at: fire.toUTC().toISO(),
        title: `${r.title} (snoozed)`, body: r.body, url: r.url, status: "pending", dedupe_key: `snooze:${r.id}:${fire.toMillis()}`,
      });
    } else if (r.activity_id && r.occurrence_date) {
      await performOccurrenceAction(admin, r.user_id, { activityId: r.activity_id, occurrenceDate: r.occurrence_date, action: "complete" });
      await syncReminders(admin, r.user_id);
    }
    await admin.from("notification_delivery_logs").insert({ user_id: r.user_id, reminder_id: r.id, event: "action", detail: input.action });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
}
