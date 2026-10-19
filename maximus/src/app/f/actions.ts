"use server";

import { z } from "zod";
import { cleanPages } from "@/lib/funnels";
import { createAdminClient } from "@/lib/supabase/server";

type Result = { ok: true } | { ok: false; message: string };

const text = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

/** Public: a visitor sends a lead or an order from a published funnel page. */
export async function submitFunnelLeadAction(slug: string, pageId: string, blockId: string, form: FormData): Promise<Result> {
  // Honeypot: bots fill every field. Pretend it worked.
  if (String(form.get("website") ?? "").length > 0) return { ok: true };
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { ok: false, message: "This page is not available." };

  const parsed = z.object({
    name: z.string().trim().min(1, "Please enter your name.").max(120),
    email: z.string().trim().email("Enter a valid email address.").max(254).optional().or(z.literal("").transform(() => undefined)),
    phone: text(40),
    message: text(1000),
    quantity: z.coerce.number().int().min(1).max(99).optional(),
  }).safeParse({
    name: form.get("name"), email: form.get("email") ?? undefined, phone: form.get("phone") ?? undefined,
    message: form.get("message") ?? undefined, quantity: form.get("quantity") ?? undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check your details." };
  const v = parsed.data;

  const admin = createAdminClient();
  const { data: funnel } = await admin.from("funnels").select("id, product, pages").eq("slug", slug).eq("published", true).maybeSingle();
  if (!funnel) return { ok: false, message: "This page is not available." };
  const block = cleanPages(funnel.pages).find((p) => p.id === pageId)?.blocks.find((b) => b.id === blockId);
  if (!block || (block.type !== "lead_form" && block.type !== "order_form")) return { ok: false, message: "This form is not available." };

  const kind = block.type === "order_form" ? "order" : "lead";
  const blockProduct = block.type === "order_form" ? block.productName : "";
  if (kind === "order" && !v.phone) return { ok: false, message: "Please enter your phone number so we can reach you." };
  if (kind === "lead" && !v.email) return { ok: false, message: "Please enter your email address." };

  // Cheap flood guard: no more than 40 submissions per funnel in 10 minutes.
  const since = new Date(Date.now() - 10 * 60_000).toISOString();
  const { count } = await admin.from("funnel_leads").select("id", { count: "exact", head: true }).eq("funnel_id", funnel.id).gte("created_at", since);
  if ((count ?? 0) >= 40) return { ok: false, message: "Too many requests right now. Please try again in a few minutes." };

  const productName = kind === "order" ? (blockProduct || String((funnel.product as { name?: string } | null)?.name ?? "")).slice(0, 120) || null : null;
  const { error } = await admin.from("funnel_leads").insert({
    funnel_id: funnel.id, kind, name: v.name, email: v.email ?? null, phone: v.phone, message: v.message,
    quantity: kind === "order" ? v.quantity ?? 1 : null, product: productName,
  });
  if (error) {
    console.error("[funnel-lead]", error.message);
    return { ok: false, message: "Sorry, we couldn't save that. Please try again." };
  }
  return { ok: true };
}
