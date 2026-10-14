import { DateTime } from "luxon";
import { route, must } from "@/lib/api";
import { pushConfigured } from "@/lib/push/send";

/** Reminder Center data: upcoming reminders, delivery history, devices, scheduler status. */
export const GET = route(async (_req, { supabase, user }) => {
  const now = DateTime.now();
  const [upcoming, recent, logs, devices, prefs] = await Promise.all([
    supabase.from("scheduled_reminders").select("id,kind,title,body,fire_at,status").eq("user_id", user.id).eq("status", "pending").gte("fire_at", now.minus({ minutes: 1 }).toUTC().toISO()!).order("fire_at").limit(40),
    supabase.from("scheduled_reminders").select("id,kind,title,body,fire_at,status,sent_at,last_error,attempts").eq("user_id", user.id).in("status", ["sent", "failed", "expired", "suppressed"]).lte("fire_at", now.toUTC().toISO()!).order("fire_at", { ascending: false }).limit(40),
    supabase.from("notification_delivery_logs").select("id,reminder_id,subscription_id,event,http_status,detail,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(120),
    supabase.from("push_subscriptions").select("id,device_label,platform,user_agent,active,failure_count,last_success_at,last_failure_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }),
    supabase.from("user_preferences").select("last_scheduler_run_at,notifications_enabled").eq("user_id", user.id).maybeSingle(),
  ]);
  return {
    pushConfigured: pushConfigured(),
    vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "",
    upcoming: must(upcoming, "upcoming"),
    recent: must(recent, "recent"),
    logs: must(logs, "logs"),
    devices: must(devices, "devices"),
    scheduler: { lastRunAt: prefs.data?.last_scheduler_run_at ?? null, notificationsEnabled: prefs.data?.notifications_enabled ?? true },
  };
});
