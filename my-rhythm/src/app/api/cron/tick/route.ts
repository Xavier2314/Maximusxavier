import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchDue, syncReminders } from "@/lib/reminders/sync";
import { serverEnv } from "@/lib/env";
import { log } from "@/lib/log";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request) {
  const secret = serverEnv().cronSecret;
  if (!secret) return false;
  const header = req.headers.get("authorization") ?? "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : new URL(req.url).searchParams.get("secret") ?? "";
  const a = Buffer.from(given);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * The background scheduler. Call every minute (Supabase pg_cron, cron-job.org,
 * or any scheduler) with `Authorization: Bearer $CRON_SECRET`.
 *  1. re-plans the next 48 h of reminders for every user (idempotent)
 *  2. atomically claims and delivers due reminders via Web Push
 */
async function tick(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const started = Date.now();
  const admin = createAdminClient();
  const { data: users } = await admin.from("profiles").select("id").not("seeded_at", "is", null);
  let planned = 0;
  for (const u of users ?? []) {
    try {
      const r = await syncReminders(admin, u.id);
      planned += r.inserted + r.updated;
      await admin.from("user_preferences").update({ last_scheduler_run_at: new Date().toISOString() }).eq("user_id", u.id);
    } catch (e) {
      log.error("cron.sync_failed", { user: u.id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  const dispatch = await dispatchDue(admin);
  const result = { ok: true, users: users?.length ?? 0, planned, ...dispatch, ms: Date.now() - started };
  if (dispatch.claimed) log.info("cron.tick", result);
  return NextResponse.json(result);
}

export const GET = tick;
export const POST = tick;
