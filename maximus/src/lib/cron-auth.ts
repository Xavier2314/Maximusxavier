import "server-only";
import { timingSafeEqual } from "node:crypto";

/** True when the request carries `Authorization: Bearer <CRON_SECRET>`. */
export function isAuthorizedCron(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const given = Buffer.from(header);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** The push dispatcher also accepts a separate token used by the database trigger that fires on every new notification. */
export function isAuthorizedDispatch(request: Request): boolean {
  if (isAuthorizedCron(request)) return true;
  const token = process.env.PUSH_DISPATCH_TOKEN;
  if (!token) return false;
  const expected = Buffer.from(`Bearer ${token}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  return given.length === expected.length && timingSafeEqual(given, expected);
}
