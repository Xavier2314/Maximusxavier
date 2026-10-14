import "server-only";
import webpush, { WebPushError } from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";
import { env, serverEnv } from "../env";
import { log } from "../log";
import { signReminderToken } from "./token";

let configured = false;
export function pushConfigured(): boolean {
  return !!(env.vapidPublicKey && serverEnv().vapidPrivateKey);
}
function ensure() {
  if (configured) return;
  if (!pushConfigured()) throw new Error("VAPID keys are not configured");
  webpush.setVapidDetails(serverEnv().vapidSubject, env.vapidPublicKey, serverEnv().vapidPrivateKey);
  configured = true;
}

export interface PushReminder {
  id: string;
  user_id: string;
  title: string;
  body: string;
  url: string;
  kind: string;
  activity_id: string | null;
  occurrence_date: string | null;
}

interface SubRow {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  failure_count: number;
}

export interface SendOutcome {
  accepted: number;
  failed: number;
  expired: number;
  devices: number;
}

/**
 * Send one reminder to every active device of its owner.
 * "accepted" means the push service (e.g. Apple) accepted the message — NOT
 * that the phone displayed it or played a sound. Device-side receipts are
 * logged separately by the service worker ("received").
 */
export async function sendReminder(admin: SupabaseClient, r: PushReminder, badgeCount = 1): Promise<SendOutcome> {
  ensure();
  const subs = (await admin.from("push_subscriptions").select("id,endpoint,p256dh,auth,failure_count").eq("user_id", r.user_id).eq("active", true)).data as SubRow[] | null;
  const outcome: SendOutcome = { accepted: 0, failed: 0, expired: 0, devices: subs?.length ?? 0 };
  if (!subs?.length) return outcome;

  const token = signReminderToken(r.id, r.user_id);
  const payload = JSON.stringify({
    title: r.title,
    body: r.body,
    url: r.url,
    tag: `${r.kind}:${r.activity_id ?? ""}:${r.occurrence_date ?? ""}:${r.id}`,
    reminderId: r.id,
    token,
    kind: r.kind,
    actionable: !!r.activity_id,
    badge: badgeCount,
    sentAt: new Date().toISOString(),
  });

  await Promise.all(
    subs.map(async (s) => {
      try {
        const res = await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, payload, {
          TTL: 60 * 30, // a reminder older than 30 min is no longer useful
          urgency: "high",
          topic: r.id.replace(/-/g, "").slice(0, 32),
        });
        outcome.accepted++;
        await Promise.all([
          admin.from("push_subscriptions").update({ last_success_at: new Date().toISOString(), failure_count: 0 }).eq("id", s.id),
          admin.from("notification_delivery_logs").insert({ user_id: r.user_id, reminder_id: r.id, subscription_id: s.id, event: "accepted", http_status: res.statusCode }),
        ]);
      } catch (e) {
        const status = e instanceof WebPushError ? e.statusCode : undefined;
        const gone = status === 404 || status === 410;
        if (gone) outcome.expired++;
        else outcome.failed++;
        log.warn("push.send_failed", { reminder: r.id, status, gone });
        await Promise.all([
          admin
            .from("push_subscriptions")
            .update({
              last_failure_at: new Date().toISOString(),
              failure_count: s.failure_count + 1,
              active: gone ? false : s.failure_count + 1 < 10,
            })
            .eq("id", s.id),
          admin.from("notification_delivery_logs").insert({
            user_id: r.user_id, reminder_id: r.id, subscription_id: s.id, event: gone ? "expired" : "failed", http_status: status ?? null,
            detail: gone ? "Subscription expired — re-enable notifications on this device." : (e instanceof Error ? e.message : String(e)).slice(0, 300),
          }),
        ]);
      }
    }),
  );
  return outcome;
}
