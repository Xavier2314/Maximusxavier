import "server-only";
import { cleanTags, normaliseEmail, normalisePhone } from "@/lib/contacts";
import { createAdminClient } from "@/lib/supabase/server";

export type CaptureInput = {
  ownerId: string; name: string; phone?: string | null; email?: string | null; source: string; stage?: "new" | "customer"; tags?: string[];
  event: { kind: "funnel_lead" | "funnel_order" | "form_response"; title: string; detail?: Record<string, unknown> };
};

/**
 * Adds the person to the owner's contacts (or updates the one already there) and records what they did.
 * Best effort: a problem here must never stop the visitor's own submission, so errors are logged, not thrown.
 */
export async function captureContact(a: CaptureInput): Promise<void> {
  try {
    const phone = normalisePhone(a.phone), email = normaliseEmail(a.email);
    if (!phone && !email) return; // no way to tell who this is
    const admin = createAdminClient();
    const { data: id, error } = await admin.rpc("upsert_contact", {
      p_owner: a.ownerId, p_name: a.name?.trim() || (email ? email.split("@")[0] : `+${phone}`), p_phone: phone, p_email: email, p_source: a.source.slice(0, 120), p_stage: a.stage ?? "new", p_tags: cleanTags(a.tags ?? []),
    });
    if (error || !id) { console.error("[contact-capture]", error?.message); return; }
    const detail = JSON.parse(JSON.stringify(a.event.detail ?? {}).slice(0, 5500) || "{}");
    const { error: e2 } = await admin.from("contact_events").insert({ contact_id: id, owner_id: a.ownerId, kind: a.event.kind, title: a.event.title.slice(0, 200), detail });
    if (e2) console.error("[contact-capture]", e2.message);
  } catch (err) {
    console.error("[contact-capture]", err);
  }
}
