"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { brandProblems } from "@/lib/branding";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type BrandState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Choose a colour");
const base = z.object({
  name: z.string().trim().max(60).optional(),
  tagline: z.string().trim().max(120).optional(),
  primary: hex, accent: hex, sidebar: hex,
  current_logo: z.string().max(500).optional(),
  remove_logo: z.enum(["on"]).optional(),
  white_label: z.enum(["on"]).optional(),
});

function colourErrors(primary: string, accent: string, sidebar: string): BrandState {
  const problems = brandProblems(primary, accent, sidebar);
  if (Object.keys(problems).length === 0) return null;
  return { ok: false, message: "Some colours would make text hard to read.", errors: Object.fromEntries(Object.entries(problems).map(([k, v]) => [k, [v]])) };
}

/** Uploads a logo (already converted to PNG on the device) and returns its public URL. */
async function uploadLogo(supabase: Awaited<ReturnType<typeof createClient>>, folder: string, file: FormDataEntryValue | null) {
  if (!(file instanceof File) || file.size === 0) return { url: undefined as string | undefined };
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) return { error: "Use a PNG, JPG or WebP logo." };
  if (file.size > 1024 * 1024) return { error: "The logo must be under 1 MB." };
  const path = `${folder}/logo-${Date.now()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
  const { error } = await supabase.storage.from("branding").upload(path, file, { contentType: file.type });
  if (error) return { error: "You can't upload a logo for this office." };
  return { url: supabase.storage.from("branding").getPublicUrl(path).data.publicUrl };
}

export async function saveOfficeBrandAction(_prev: BrandState, formData: FormData): Promise<BrandState> {
  const parsed = base.extend({ office_id: z.string().uuid() }).safeParse(Object.fromEntries([...formData.entries()].filter(([k]) => k !== "logo")));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const bad = colourErrors(v.primary, v.accent, v.sidebar);
  if (bad) return bad;
  const supabase = await createClient();
  const logo = await uploadLogo(supabase, `office/${v.office_id}`, formData.get("logo"));
  if (logo.error) return { ok: false, message: logo.error };
  const logoUrl = logo.url ?? (v.remove_logo ? null : v.current_logo || null);
  const { error } = await supabase.rpc("set_office_branding", {
    p_office: v.office_id, p_display_name: v.name ?? "", p_tagline: v.tagline ?? "", p_logo_url: logoUrl,
    p_primary: v.primary, p_accent: v.accent, p_sidebar: v.sidebar, p_white_label: Boolean(v.white_label),
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Branding saved. Your office now wears its own look." };
}

export async function resetOfficeBrandAction(officeId: string): Promise<BrandState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_office_branding", {
    p_office: officeId, p_display_name: "", p_tagline: "", p_logo_url: null,
    p_primary: null, p_accent: null, p_sidebar: null, p_white_label: false,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Back to the standard look." };
}

/** Super Admin: white-label the whole platform. */
export async function savePlatformBrandAction(_prev: BrandState, formData: FormData): Promise<BrandState> {
  const parsed = base.safeParse(Object.fromEntries([...formData.entries()].filter(([k]) => k !== "logo")));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const bad = colourErrors(v.primary, v.accent, v.sidebar);
  if (bad) return bad;
  const supabase = await createClient();
  const logo = await uploadLogo(supabase, "platform", formData.get("logo"));
  if (logo.error) return { ok: false, message: logo.error };
  const logoUrl = logo.url ?? (v.remove_logo ? null : v.current_logo || null);
  const brand = Object.fromEntries(Object.entries({
    app_name: v.name || null, tagline: v.tagline || null, logo_url: logoUrl,
    primary: v.primary, accent: v.accent, sidebar: v.sidebar,
  }).filter(([, x]) => x));
  const { error } = await supabase.rpc("set_platform_branding", { p_brand: brand });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Platform branding saved." };
}

export async function resetPlatformBrandAction(): Promise<BrandState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_platform_branding", { p_brand: {} });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Back to the Maximus look." };
}
