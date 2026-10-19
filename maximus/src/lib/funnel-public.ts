import "server-only";
import { cleanPages, cleanProduct, cleanTheme, type FunnelPage, type FunnelProduct, type FunnelTheme } from "@/lib/funnels";
import { createAdminClient } from "@/lib/supabase/server";

export type PublicFunnel = { id: string; title: string; slug: string; theme: FunnelTheme; product: FunnelProduct; pages: FunnelPage[]; whatsapp: string | null };

/** A published funnel plus what a visitor needs, read on the server so nothing private reaches the browser. */
export async function loadPublicFunnel(slug: string): Promise<PublicFunnel | null> {
  if (!/^[a-z0-9-]{3,40}$/.test(slug) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const admin = createAdminClient();
  const { data: f } = await admin.from("funnels").select("id, user_id, title, slug, product, theme, pages").eq("slug", slug).eq("published", true).maybeSingle();
  if (!f) return null;
  const { data: owner } = await admin.from("profiles").select("whatsapp").eq("id", f.user_id).eq("status", "active").maybeSingle();
  if (!owner) return null;
  const product = cleanProduct(f.product);
  const digits = (owner.whatsapp ?? "").replace(/\D/g, "");
  return {
    id: f.id, title: f.title, slug: f.slug, theme: cleanTheme(f.theme), product, pages: cleanPages(f.pages),
    whatsapp: product.whatsapp && digits.length >= 8 ? digits : null,
  };
}

export const countFunnelView = (slug: string) => createAdminClient().rpc("funnel_viewed", { p_slug: slug });
