import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "../env";

/**
 * Short signed tokens embedded in push payloads so the service worker can
 * report receipts / perform notification actions (snooze, complete) for ONE
 * specific reminder without a session cookie. Tokens expire after 3 days.
 */
export function signReminderToken(reminderId: string, userId: string, ttlSeconds = 3 * 86400): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${reminderId}.${userId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

export function verifyReminderToken(token: string): { reminderId: string; userId: string } | null {
  const [p, sig] = token.split(".");
  if (!p || !sig) return null;
  const payload = Buffer.from(p, "base64url").toString();
  const expected = createHmac("sha256", secret()).update(payload).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const [reminderId, userId, exp] = payload.split(".");
  if (!reminderId || !userId || Number(exp) < Date.now() / 1000) return null;
  return { reminderId, userId };
}

function secret() {
  const s = serverEnv().pushActionSecret;
  if (!s) throw new Error("PUSH_ACTION_SECRET (or CRON_SECRET) must be set");
  return s;
}
