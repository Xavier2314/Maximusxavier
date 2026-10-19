import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/server";

export const BRAND_COOKIE = "mx-brand";

export type CompanyBrand = { id: string; name: string; logo: string | null; primary: string | null; full: boolean };

/** The company whose link the visitor came in through (set by /c/<slug>), for branding sign-in pages. */
export async function companyFromCookie(): Promise<CompanyBrand | null> {
  const id = (await cookies()).get(BRAND_COOKIE)?.value;
  if (!id || !/^[0-9a-f-]{36}$/i.test(id) || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { data } = await createAdminClient().from("offices")
    .select("id, name, display_name, logo_url, primary_color, white_label, full_white_label").eq("id", id).eq("is_active", true).maybeSingle();
  if (!data?.white_label) return null;
  return { id: data.id, name: data.display_name || data.name, logo: data.logo_url, primary: data.primary_color, full: Boolean(data.full_white_label) };
}
