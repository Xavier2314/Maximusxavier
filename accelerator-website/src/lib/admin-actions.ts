"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { checkPassword, createSession, destroySession, requireAdmin } from "./admin-auth";
import { db } from "./db";
import { lagosLocalToIso } from "./tickets";
import { sendConfirmation, type Registration } from "./registrations";

// ---- auth --------------------------------------------------------------------------------
const attempts = new Map<string, { n: number; until: number }>();

export async function login(_: { error?: string } | undefined, form: FormData): Promise<{ error?: string }> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const a = attempts.get(ip);
  if (a && a.until > Date.now()) return { error: "Too many attempts. Wait a few minutes and try again." };
  if (!checkPassword(String(form.get("password") ?? ""))) {
    const n = (a?.n ?? 0) + 1;
    attempts.set(ip, { n, until: n >= 5 ? Date.now() + 5 * 60_000 : 0 });
    return { error: "Incorrect password." };
  }
  attempts.delete(ip);
  await createSession();
  await audit("owner", "login", null, { ip });
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}

// ---- helpers -----------------------------------------------------------------------------
async function audit(actor: string, action: string, target: string | null, details: Record<string, unknown>) {
  try { await db().from("admin_audit").insert({ actor, action, target, details }); } catch { /* audit must never block */ }
}
const s = (f: FormData, k: string) => { const v = String(f.get(k) ?? "").trim(); return v === "" ? null : v; };
const n = (f: FormData, k: string) => { const v = s(f, k); return v == null ? 0 : Number(v) || 0; };
const b = (f: FormData, k: string) => f.get(k) === "on";

// ---- tickets -----------------------------------------------------------------------------
export async function updateTicket(form: FormData) {
  const me = await requireAdmin();
  const id = s(form, "id");
  if (id !== "early_bird" && id !== "late") return;
  const naira = s(form, "price");
  const price = naira == null ? null : Math.round(Number(naira.replace(/[,\s]/g, "")) * 100);
  const patch = {
    name: s(form, "name") ?? id,
    description: s(form, "description") ?? "",
    price_kobo: price && price > 0 ? price : null,
    sales_start: lagosLocalToIso(String(form.get("sales_start") ?? "")),
    sales_end: lagosLocalToIso(String(form.get("sales_end") ?? "")),
    benefits: String(form.get("benefits") ?? "").split("\n").map((x) => x.trim()).filter(Boolean),
    enabled: b(form, "enabled"),
    updated_at: new Date().toISOString(),
  };
  await db().from("ticket_types").update(patch).eq("id", id);
  await audit(me.actor, "ticket.update", id, patch);
  revalidatePath("/", "layout");
}

// ---- event settings ------------------------------------------------------------------------
export async function updateEvent(form: FormData) {
  const me = await requireAdmin();
  const value = {
    name: s(form, "name") ?? "Accelerators Events 2026",
    theme: s(form, "theme"),
    themeTagline: s(form, "themeTagline"),
    startsAt: lagosLocalToIso(String(form.get("startsAt") ?? "")),
    timeConfirmed: b(form, "timeConfirmed"),
    endsAt: lagosLocalToIso(String(form.get("endsAt") ?? "")),
    venueName: s(form, "venueName"),
    address: s(form, "address"),
    city: s(form, "city"),
    summary: s(form, "summary"),
  };
  await db().from("settings").upsert({ key: "event", value, updated_at: new Date().toISOString() });
  await audit(me.actor, "event.update", "event", value);
  revalidatePath("/", "layout");
}

// ---- speakers / awards / contests ------------------------------------------------------------
type Table = "speakers" | "awards" | "contests";
const FIELDS: Record<Table, (f: FormData) => Record<string, unknown>> = {
  speakers: (f) => ({ name: s(f, "name") ?? "Untitled", title: s(f, "title"), bio: s(f, "bio"), topic: s(f, "topic"), photo_url: s(f, "photo_url"), sort_order: n(f, "sort_order"), published: b(f, "published") }),
  awards: (f) => ({ title: s(f, "title") ?? "Untitled", description: s(f, "description"), nominees: s(f, "nominees"), winners: s(f, "winners"), sort_order: n(f, "sort_order"), published: b(f, "published") }),
  contests: (f) => {
    const st = s(f, "status");
    return {
      title: s(f, "title") ?? "Untitled", description: s(f, "description"), requirements: s(f, "requirements"),
      starts_at: lagosLocalToIso(String(f.get("starts_at") ?? "")), deadline: lagosLocalToIso(String(f.get("deadline") ?? "")),
      status: ["coming_soon", "open", "closed", "winners_announced"].includes(st ?? "") ? st : "coming_soon",
      prize: s(f, "prize"), submission_url: s(f, "submission_url"), rules: s(f, "rules"), winners: s(f, "winners"),
      sort_order: n(f, "sort_order"), published: b(f, "published"),
    };
  },
};

export async function saveItem(form: FormData) {
  const me = await requireAdmin();
  const table = s(form, "_table") as Table;
  if (!FIELDS[table]) return;
  const id = s(form, "id");
  const row = FIELDS[table](form);
  if (id) await db().from(table).update(row).eq("id", id);
  else await db().from(table).insert(row);
  await audit(me.actor, `${table}.${id ? "update" : "create"}`, id, row);
  revalidatePath("/", "layout");
}

export async function deleteItem(form: FormData) {
  const me = await requireAdmin();
  const table = s(form, "_table") as Table;
  const id = s(form, "id");
  if (!FIELDS[table] || !id) return;
  await db().from(table).delete().eq("id", id);
  await audit(me.actor, `${table}.delete`, id, {});
  revalidatePath("/", "layout");
}

export async function verifyRegistration(form: FormData) {
  const me = await requireAdmin();
  const id = s(form, "id");
  const decision = s(form, "decision");
  if (!id || (decision !== "paid" && decision !== "rejected")) return;
  const patch = decision === "paid"
    ? { status: "paid", paid_at: new Date().toISOString(), channel: "bank_transfer", gateway_response: `Verified by ${me.actor}`, updated_at: new Date().toISOString() }
    : { status: "rejected", gateway_response: s(form, "reason") ?? `Rejected by ${me.actor}`, updated_at: new Date().toISOString() };
  const { data, error } = await db().from("registrations").update(patch).eq("id", id).in("status", ["awaiting_payment", "awaiting_verification"]).select("*").maybeSingle();
  if (error?.code === "23505") {
    await db().from("registrations").update({ status: "duplicate_paid", gateway_response: "Email already confirmed - review for refund" }).eq("id", id);
  } else if (data && decision === "paid") {
    await sendConfirmation(data as Registration);
  }
  await audit(me.actor, `registration.${decision}`, id, { reference: (data as Registration | null)?.reference ?? null });
  revalidatePath("/admin/registrations");
  revalidatePath("/admin");
}

export async function toggleMessageHandled(form: FormData) {
  const me = await requireAdmin();
  const id = s(form, "id");
  if (!id) return;
  await db().from("contact_messages").update({ handled: b(form, "handled") }).eq("id", id);
  await audit(me.actor, "message.handled", id, { handled: b(form, "handled") });
  revalidatePath("/admin/messages");
}
