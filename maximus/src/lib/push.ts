import "server-only";
import webpush from "web-push";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const isPushConfigured = () => Boolean(env.vapidPublicKey && process.env.VAPID_PRIVATE_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY);

type Pending = {
  id: string; user_id: string; type: string; title: string; body: string | null; link: string | null; push_attempts: number;
};
type Prefs = { user_id: string; push_enabled: boolean; muted_types: string[]; quiet_start: string | null; quiet_end: string | null };

/** Minutes since midnight in a time zone. */
function minutesNow(timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).formatToParts(new Date());
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0) % 24;
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}
const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };

/** If now is within quiet hours, returns minutes until they end; otherwise 0. */
function quietMinutesLeft(p: Prefs | undefined, tz: string): number {
  if (!p?.quiet_start || !p.quiet_end) return 0;
  const now = minutesNow(tz), s = toMin(p.quiet_start), e = toMin(p.quiet_end);
  const inQuiet = s <= e ? now >= s && now < e : now >= s || now < e;
  if (!inQuiet) return 0;
  return (e - now + 1440) % 1440 || 1440;
}

/**
 * Delivers queued notifications as web push. Applies each member's push
 * preference, muted types, time zone and quiet hours. Safe to run repeatedly.
 */
export async function dispatchPendingPush(limit = 300) {
  if (!isPushConfigured()) return { configured: false, sent: 0, skipped: 0, deferred: 0, failed: 0 };
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@maximus.app", env.vapidPublicKey, process.env.VAPID_PRIVATE_KEY!);
  const admin = createAdminClient();
  const nowIso = new Date().toISOString();

  const { data: queue } = await admin.from("notifications")
    .select("id, user_id, type, title, body, link, push_attempts")
    .or(`push_status.eq.pending,and(push_status.eq.deferred,push_after.lte.${nowIso})`)
    .order("created_at").limit(limit).returns<Pending[]>();
  if (!queue?.length) return { configured: true, sent: 0, skipped: 0, deferred: 0, failed: 0 };

  const users = [...new Set(queue.map((n) => n.user_id))];
  const [{ data: prefs }, { data: subs }, { data: profiles }] = await Promise.all([
    admin.from("notification_preferences").select("user_id, push_enabled, muted_types, quiet_start, quiet_end").in("user_id", users).returns<Prefs[]>(),
    admin.from("push_subscriptions").select("id, user_id, endpoint, p256dh, auth").in("user_id", users),
    admin.from("profiles").select("id, timezone").in("id", users),
  ]);
  const prefBy = new Map((prefs ?? []).map((p) => [p.user_id, p]));
  const tzBy = new Map((profiles ?? []).map((p) => [p.id as string, (p.timezone as string) || "Africa/Lagos"]));
  const stats = { configured: true, sent: 0, skipped: 0, deferred: 0, failed: 0 };

  for (const n of queue) {
    const pref = prefBy.get(n.user_id);
    const userSubs = (subs ?? []).filter((s) => s.user_id === n.user_id);
    if (!pref?.push_enabled || pref.muted_types?.includes(n.type) || userSubs.length === 0) {
      await admin.from("notifications").update({ push_status: "skipped" }).eq("id", n.id);
      stats.skipped++;
      continue;
    }
    const wait = quietMinutesLeft(pref, tzBy.get(n.user_id) ?? "Africa/Lagos");
    if (wait > 0) {
      await admin.from("notifications").update({ push_status: "deferred", push_after: new Date(Date.now() + wait * 60000).toISOString() }).eq("id", n.id);
      stats.deferred++;
      continue;
    }
    const payload = JSON.stringify({ title: n.title, body: n.body ?? "", url: n.link ?? "/notifications", tag: n.type });
    let delivered = false;
    for (const s of userSubs) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint as string, keys: { p256dh: s.p256dh as string, auth: s.auth as string } }, payload, { TTL: 60 * 60 * 24 });
        delivered = true;
        await admin.from("push_subscriptions").update({ last_used_at: nowIso }).eq("id", s.id);
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        // The browser unsubscribed or the subscription expired: forget it.
        if (code === 404 || code === 410) await admin.from("push_subscriptions").delete().eq("id", s.id);
      }
    }
    const attempts = n.push_attempts + 1;
    await admin.from("notifications").update({
      push_status: delivered ? "sent" : attempts >= 3 ? "failed" : "pending", push_attempts: attempts,
    }).eq("id", n.id);
    if (delivered) stats.sent++; else stats.failed++;
  }
  return stats;
}

/** Schedule a push dispatch after the current response is sent (no added latency). */
export function dispatchPushSoon() {
  if (!isPushConfigured()) return;
  after(async () => {
    try { await dispatchPendingPush(100); } catch { /* the cron sweep retries */ }
  });
}
