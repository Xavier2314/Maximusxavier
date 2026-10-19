"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { designFunnel, reviseFunnel } from "@/lib/funnel-ai";
import { cleanPages, cleanProduct, cleanTheme, DEFAULT_THEME, starterPages, type FunnelPage, type FunnelTheme } from "@/lib/funnels";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type State = { ok: boolean; message: string } | null;
export type AiResult = { ok: boolean; message: string; pages?: FunnelPage[]; theme?: FunnelTheme };

const slugRule = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, "Use 3–40 letters, numbers or dashes for the link.");
const id = z.string().uuid();

export async function createFunnelAction(_: State, form: FormData): Promise<State> {
  const viewer = await requireViewer();
  const product = cleanProduct({
    name: form.get("name"), price: form.get("price"), description: form.get("description"), benefits: form.get("benefits"),
    audience: form.get("audience"), offer: form.get("offer"), imageUrl: form.get("imageUrl"), whatsapp: form.get("whatsapp") === "on",
  });
  if (!product.name) return { ok: false, message: "Enter the product name." };
  const mode = form.get("mode") === "blank" ? "blank" : "ai";
  const goal = form.get("goal") === "leads" ? "leads" : "sell";
  const tone = z.string().trim().max(60).catch("").parse(form.get("tone") ?? "");

  let pages: FunnelPage[] = starterPages(product.name);
  let theme = DEFAULT_THEME;
  let title = product.name;
  if (mode === "ai") {
    if (product.description.length < 10 && product.benefits.length < 10) return { ok: false, message: "Tell the AI a little about the product: what it is and its benefits." };
    const draft = await designFunnel({ product, goal, tone, ownerName: viewer.profile.full_name });
    if ("error" in draft) return { ok: false, message: draft.error };
    pages = draft.pages; theme = draft.theme; title = draft.title || product.name;
  }

  const supabase = await createClient();
  const { data: slug } = await supabase.rpc("suggest_funnel_slug", { p_hint: product.name });
  const { data, error } = await supabase.from("funnels").insert({ title: title.slice(0, 80), slug: slug as string, product, theme, pages, published: false }).select("id").single();
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  revalidatePath("/marketing/funnels");
  redirect(`/marketing/funnels/${data.id}?new=1`);
}

export async function saveFunnelAction(funnelId: string, payload: string): Promise<State> {
  if (!id.safeParse(funnelId).success) return { ok: false, message: "Unknown funnel." };
  await requireViewer();
  let raw: Record<string, unknown>;
  try { raw = payload.length < 400_000 ? JSON.parse(payload) : {}; } catch { return { ok: false, message: "Could not read your changes." }; }
  const head = z.object({ title: z.string().trim().min(1, "Give the funnel a name.").max(80), slug: slugRule, published: z.boolean() }).safeParse(raw);
  if (!head.success) return { ok: false, message: head.error.issues[0]?.message ?? "Check the funnel settings." };
  const pages = cleanPages(raw.pages);
  if (!pages.length) return { ok: false, message: "A funnel needs at least one page." };
  const supabase = await createClient();
  const { error } = await supabase.from("funnels").update({
    ...head.data, product: cleanProduct(raw.product), theme: cleanTheme(raw.theme), pages,
  }).eq("id", funnelId);
  if (error) return { ok: false, message: error.code === "23505" ? "That link name is taken. Try another." : friendlyError(error) };
  revalidatePath(`/marketing/funnels/${funnelId}`);
  revalidatePath("/marketing/funnels");
  return { ok: true, message: "Saved." };
}

/** Asks the AI to change the funnel (or redesign it from scratch). Returns the result for the editor to preview. */
export async function aiFunnelAction(funnelId: string, instruction: string, current: string): Promise<AiResult> {
  if (!id.safeParse(funnelId).success) return { ok: false, message: "Unknown funnel." };
  const viewer = await requireViewer();
  const note = z.string().trim().min(3, "Tell the AI what to change.").max(1500).safeParse(instruction);
  if (!note.success) return { ok: false, message: note.error.issues[0]?.message ?? "Tell the AI what to change." };
  const supabase = await createClient();
  const { data: f } = await supabase.from("funnels").select("product, theme, pages").eq("id", funnelId).maybeSingle();
  if (!f) return { ok: false, message: "Unknown funnel." };
  let cur: { pages?: unknown; theme?: unknown; product?: unknown } = {};
  try { cur = current.length < 400_000 ? JSON.parse(current) : {}; } catch { /* fall back to saved */ }
  const draft = await reviseFunnel({
    product: cleanProduct(cur.product ?? f.product), theme: cleanTheme(cur.theme ?? f.theme), pages: cleanPages(cur.pages ?? f.pages),
    instruction: note.data, ownerName: viewer.profile.full_name,
  });
  if ("error" in draft) return { ok: false, message: draft.error };
  return { ok: true, message: "Done. Review the changes, then press Save.", pages: draft.pages, theme: draft.theme };
}

export async function deleteFunnelAction(funnelId: string) {
  if (!id.safeParse(funnelId).success) return;
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("funnels").delete().eq("id", funnelId);
  revalidatePath("/marketing/funnels");
  redirect("/marketing/funnels");
}

export async function deleteLeadAction(funnelId: string, leadId: string) {
  if (!id.safeParse(funnelId).success || !id.safeParse(leadId).success) return;
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("funnel_leads").delete().eq("id", leadId).eq("funnel_id", funnelId);
  revalidatePath(`/marketing/funnels/${funnelId}/leads`);
}
