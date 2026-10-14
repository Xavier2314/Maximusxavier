import { z } from "zod";
import { DateTime } from "luxon";
import { body, HttpError, must, route } from "@/lib/api";

/**
 * Countdown-timer alerts. When a countdown starts, the server stores a one-off
 * reminder for the moment it ends, so the phone is notified by the background
 * scheduler even if the app is closed. Pausing/resetting cancels it.
 */
const Create = z.object({
  fireAt: z.string(),
  label: z.string().trim().max(120).optional(),
  url: z.string().max(300).optional(),
});

export const POST = route(async (req, { supabase, user }) => {
  const i = await body(req, Create);
  const fire = DateTime.fromISO(i.fireAt);
  if (!fire.isValid) throw new HttpError(400, "Invalid time");
  if (fire < DateTime.now().minus({ seconds: 5 }) || fire > DateTime.now().plus({ hours: 12 })) throw new HttpError(400, "Timer must end within the next 12 hours");
  const label = i.label || "Timer";
  const row = must(
    await supabase
      .from("scheduled_reminders")
      .insert({
        user_id: user.id, kind: "custom", fire_at: fire.toUTC().toISO(), status: "pending",
        title: `⏱ ${label} — time's up`, body: label === "Timer" ? "Your timer has finished." : `Your “${label}” timer has finished.`,
        url: i.url && i.url.startsWith("/") ? i.url : "/timer", dedupe_key: `timer:${fire.toMillis()}:${Math.random().toString(36).slice(2, 8)}`,
      })
      .select("id")
      .single(),
    "create timer alert",
  ) as { id: string };
  return { id: row.id };
});

export const DELETE = route(async (req, { supabase }) => {
  const { id } = await body(req, z.object({ id: z.string().uuid() }));
  must(await supabase.from("scheduled_reminders").update({ status: "cancelled" }).eq("id", id).eq("kind", "custom").eq("status", "pending"), "cancel timer alert");
  return { ok: true };
});
