"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer, requireViewer } from "@/lib/auth";
import { reviseFunnel } from "@/lib/funnel-ai";
import { STYLES } from "@/lib/funnel-styles";
import { MAX_HTML, htmlToBlocks } from "@/lib/html-import";
import { cleanPages, cleanProduct, cleanTheme, EMPTY_PRODUCT, newPage, type FunnelBlock, type FunnelProduct, type FunnelTheme } from "@/lib/funnels";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type ImportResult = { ok: boolean; message: string; blocks?: FunnelBlock[]; warnings?: string[]; title?: string; theme?: FunnelTheme };
const id = z.string().uuid();

const REBUILD = `These sections were imported from the seller's own HTML page, so they are plain layout blocks. Rebuild this single page so it looks professionally designed, using the best-fitting ready-made blocks from the catalog (hero, benefits, steps, product, offer, testimonials, faq, lead_form or order_form, cta, footer) and clean custom "section" layouts where side-by-side layout helps.
Keep ALL of the seller's real copy, prices, offers, image URLs, button links, video links and form questions. Do not invent anything: no reviews, numbers, guarantees or claims that are not already in the imported content. Do not drop any real image or the form. Return one page with all of it.`;

async function convert(html: string, mode: "keep" | "ai", product: FunnelProduct, theme: FunnelTheme, ownerName: string): Promise<ImportResult> {
  if (typeof html !== "string" || html.trim().length < 20) return { ok: false, message: "Paste the page's HTML first." };
  if (html.length > MAX_HTML) return { ok: false, message: "That file is too large (over 500 KB). Paste only the page body, or remove big inline data." };
  const imp = htmlToBlocks(html);
  if (!imp.blocks.length) return { ok: false, message: "No readable content was found in that HTML. Paste the full page source (the part between <body> tags)." };
  if (mode === "keep") return { ok: true, message: `Imported ${imp.stats.sections} section${imp.stats.sections === 1 ? "" : "s"} with ${imp.stats.elements} elements.`, blocks: imp.blocks, warnings: imp.warnings, title: imp.title };
  const draft = await reviseFunnel({ product, pages: [newPage("Imported page", imp.blocks)], theme, instruction: REBUILD, ownerName });
  if ("error" in draft) return { ok: false, message: `${draft.error} You can still import it with "Keep my layout".` };
  const blocks = draft.pages.flatMap((p) => p.blocks);
  return { ok: true, message: "Rebuilt in a designed layout from your content.", blocks, warnings: imp.warnings.filter((w) => !/CSS/.test(w)), title: imp.title, theme: draft.theme };
}

/** Converts pasted HTML into funnel sections for the builder to review and apply to an existing funnel. */
export async function importHtmlAction(funnelId: string, html: string, mode: "keep" | "ai"): Promise<ImportResult> {
  if (!id.safeParse(funnelId).success) return { ok: false, message: "Unknown funnel." };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Your session expired. Sign in again in another tab, then try again." };
  const supabase = await createClient();
  const { data: f } = await supabase.from("funnels").select("product, theme").eq("id", funnelId).maybeSingle();
  if (!f) return { ok: false, message: "Unknown funnel." };
  return convert(html, mode === "ai" ? "ai" : "keep", cleanProduct(f.product), cleanTheme(f.theme), viewer.profile.full_name);
}

/** Starts a brand-new funnel from pasted HTML. */
export async function createFunnelFromHtmlAction(_: { ok: boolean; message: string } | null, form: FormData): Promise<{ ok: boolean; message: string } | null> {
  const viewer = await requireViewer();
  const name = z.string().trim().min(1, "Give the funnel a name.").max(80).safeParse(form.get("name"));
  if (!name.success) return { ok: false, message: name.error.issues[0]?.message ?? "Give the funnel a name." };
  const mode = form.get("mode") === "ai" ? "ai" : "keep";
  const product: FunnelProduct = { ...EMPTY_PRODUCT, name: name.data };
  const theme: FunnelTheme = { style: "clean", accent: STYLES.clean.accent, mode: STYLES.clean.mode };
  const res = await convert(String(form.get("html") ?? ""), mode, product, theme, viewer.profile.full_name);
  if (!res.ok || !res.blocks) return { ok: false, message: res.message };
  const pages = cleanPages([newPage("Landing page", res.blocks)]);
  if (!pages.length) return { ok: false, message: "Nothing could be imported from that HTML." };
  const supabase = await createClient();
  const { data: slug } = await supabase.rpc("suggest_funnel_slug", { p_hint: name.data });
  const { data, error } = await supabase.from("funnels").insert({ title: name.data, slug: slug as string, product, theme: res.theme ?? theme, pages, published: false }).select("id").single();
  if (error || !data) return { ok: false, message: friendlyError(error, "Could not create the funnel.") };
  revalidatePath("/marketing/funnels");
  redirect(`/builder/${data.id}`);
}
