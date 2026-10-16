import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const COOKIE = "acc_admin";
const MAX_AGE = 60 * 60 * 8; // 8 hours

export function adminConfigured() {
  return Boolean(process.env.ADMIN_PASSWORD && process.env.ADMIN_SESSION_SECRET && process.env.ADMIN_SESSION_SECRET.length >= 32);
}

function sign(payload: string) {
  return crypto.createHmac("sha256", process.env.ADMIN_SESSION_SECRET!).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function checkPassword(input: string) {
  return adminConfigured() && safeEqual(input, process.env.ADMIN_PASSWORD!);
}

/** Role is "owner" for now; the token format already carries a role for future multi-user admin. */
export async function createSession(actor = "owner", role = "owner") {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = Buffer.from(JSON.stringify({ actor, role, exp })).toString("base64url");
  const jar = await cookies();
  jar.set(COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export type AdminSession = { actor: string; role: string; exp: number };

export async function getSession(): Promise<AdminSession | null> {
  if (!adminConfigured()) return null;
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw) return null;
  const [payload, sig] = raw.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, "base64url").toString()) as AdminSession;
    if (s.exp < Date.now() / 1000) return null;
    return s;
  } catch {
    return null;
  }
}

export async function requireAdmin(): Promise<AdminSession> {
  const s = await getSession();
  if (!s) redirect("/admin/login");
  return s;
}
