import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { loadRules, loadScheduleData } from "../data";
import { planReminders, type ScheduledReminder } from "./planner";
import { sendReminder, pushConfigured } from "../push/send";
import { log } from "../log";

/**
 * Re-plan the next 48 hours of reminders for one user. Called by the cron tick
 * every minute AND immediately after any schedule change, so reminders always
 * reflect the current calendar. Safe to call concurrently: inserts are
 * protected by UNIQUE(user_id, dedupe_key).
 */
export async function syncReminders(sb: SupabaseClient, userId: string, now = DateTime.now()) {
  const data = await loadScheduleData(sb, userId, { completionsFrom: now.minus({ days: 2 }).toISODate()! });
  const rules = await loadRules(sb, userId);
  const { data: existing, error } = await sb
    .from("scheduled_reminders")
    .select("id,activity_id,occurrence_date,rule_id,kind,fire_at,title,body,url,status,dedupe_key")
    .eq("user_id", userId)
    .gte("fire_at", now.minus({ days: 1 }).toUTC().toISO()!);
  if (error) throw new Error(error.message);

  const plan = planReminders({ data, rules, existing: (existing ?? []) as (ScheduledReminder & { id: string })[], now });
  if (plan.inserts.length) {
    const { error: e } = await sb
      .from("scheduled_reminders")
      .upsert(plan.inserts.map((r) => ({ ...r, user_id: userId })), { onConflict: "user_id,dedupe_key", ignoreDuplicates: true });
    if (e) throw new Error(e.message);
  }
  for (const u of plan.updates) {
    // only touch rows that are not mid-delivery
    await sb.from("scheduled_reminders").update(u.patch).eq("id", u.id).neq("status", "sending");
  }
  return { inserted: plan.inserts.length, updated: plan.updates.length };
}

/** Best-effort sync after a user-initiated change (never fails the request). */
export async function syncAfterChange(sb: SupabaseClient, userId: string) {
  try {
    await syncReminders(sb, userId);
  } catch (e) {
    log.warn("reminders.sync_after_change_failed", { error: e instanceof Error ? e.message : String(e) });
  }
}

interface ClaimedRow {
  id: string;
  user_id: string;
  activity_id: string | null;
  occurrence_date: string | null;
  kind: string;
  title: string;
  body: string;
  url: string;
  attempts: number;
}

/**
 * Deliver every due reminder. Rows are claimed atomically in the database
 * (FOR UPDATE SKIP LOCKED) so overlapping ticks can never double-send.
 */
export async function dispatchDue(admin: SupabaseClient) {
  if (!pushConfigured()) return { claimed: 0, sent: 0, skipped: 0, note: "VAPID not configured" };
  const { data, error } = await admin.rpc("claim_due_reminders", { p_limit: 100, p_late_minutes: 30 });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as ClaimedRow[];
  let sent = 0;
  let skipped = 0;
  for (const r of rows) {
    try {
      // Final safety check: never nag about something already completed/skipped.
      if (r.activity_id && r.occurrence_date) {
        const { data: c } = await admin
          .from("activity_completions")
          .select("status")
          .eq("activity_id", r.activity_id)
          .eq("occurrence_date", r.occurrence_date)
          .maybeSingle();
        if (c && c.status !== "in_progress") {
          await admin.from("scheduled_reminders").update({ status: "suppressed" }).eq("id", r.id);
          skipped++;
          continue;
        }
      }
      const out = await sendReminder(admin, r);
      const ok = out.accepted > 0;
      await admin
        .from("scheduled_reminders")
        .update({
          status: ok ? "sent" : r.attempts >= 3 || out.devices === 0 ? "failed" : "pending",
          sent_at: ok ? new Date().toISOString() : null,
          last_error: ok ? null : out.devices === 0 ? "No active devices — enable notifications on your iPhone." : `Push failed on ${out.failed + out.expired} device(s)`,
        })
        .eq("id", r.id);
      if (ok) sent++;
    } catch (e) {
      log.error("reminders.dispatch_failed", { id: r.id, error: e instanceof Error ? e.message : String(e) });
      await admin.from("scheduled_reminders").update({ status: r.attempts >= 3 ? "failed" : "pending", last_error: "Internal error" }).eq("id", r.id);
    }
  }
  return { claimed: rows.length, sent, skipped };
}
