import { z } from "zod";
import { DateTime } from "luxon";
import { body, HttpError, must, route } from "@/lib/api";
import { createAdminClient } from "@/lib/supabase/admin";
import { pushConfigured, sendReminder } from "@/lib/push/send";

/**
 * Test notifications.
 *  delaySeconds = 0  → sent immediately by the server (proves server → Apple → device).
 *  delaySeconds = 60 → stored as a scheduled reminder and sent by the background
 *                      scheduler (proves delivery while the app is closed).
 */
export const POST = route(async (req, { supabase, user }) => {
  const { delaySeconds } = await body(req, z.object({ delaySeconds: z.union([z.literal(0), z.literal(60)]) }));
  if (!pushConfigured()) throw new HttpError(503, "Push is not configured on the server (VAPID keys missing).");
  const now = DateTime.now();
  const row = must(
    await supabase
      .from("scheduled_reminders")
      .insert({
        user_id: user.id, kind: "test", fire_at: now.plus({ seconds: delaySeconds }).toUTC().toISO(),
        title: delaySeconds ? "Scheduled test reminder" : "Test notification",
        body: delaySeconds
          ? "This was sent by the background scheduler. If you see this with the app closed, server reminders work. 🎉"
          : "If you can see (and hear) this, notifications are working on this device.",
        url: "/reminders?tested=1", status: delaySeconds ? "pending" : "sending",
        dedupe_key: `test:${now.toMillis()}`,
      })
      .select()
      .single(),
    "create test reminder",
  ) as { id: string; user_id: string; title: string; body: string; url: string; kind: string };
  if (delaySeconds) return { scheduled: true, fireAt: now.plus({ seconds: delaySeconds }).toISO() };
  const admin = createAdminClient();
  const out = await sendReminder(admin, { ...row, activity_id: null, occurrence_date: null });
  await admin.from("scheduled_reminders").update({ status: out.accepted ? "sent" : "failed", sent_at: out.accepted ? new Date().toISOString() : null,
    last_error: out.accepted ? null : out.devices ? "Push service rejected the message" : "No active devices" }).eq("id", row.id);
  return { ...out, note: "“accepted” means Apple/Google accepted the push. Only your phone can confirm it was shown — check for a “received” entry below." };
});
