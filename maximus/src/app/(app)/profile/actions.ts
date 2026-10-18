"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { RANKS } from "@/lib/ranks";
import { friendlyError } from "@/lib/utils";

const RANK_KEYS = RANKS.map((r) => r.key);

export type ProfileState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const phone = z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "Enter a valid phone number");

export async function updateProfileAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = z.object({
    full_name: z.string().trim().min(2, "Enter your full name").max(120),
    phone, whatsapp: phone,
    date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
    gender: z.enum(["female", "male", "other", "prefer_not_to_say", ""]).optional(),
    bio: z.string().trim().max(500).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("profiles").update({
    full_name: v.full_name, phone: v.phone, whatsapp: v.whatsapp,
    date_of_birth: v.date_of_birth || null, gender: v.gender || null, bio: v.bio || null,
  }).eq("id", user.id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile updated." };
}

export async function uploadAvatarAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { ok: false, message: "Use a JPG, PNG or WebP image." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, message: "Images must be under 2 MB." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) return { ok: false, message: "Upload failed. Please try again." };
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase.from("profiles").update({ avatar_url: data.publicUrl }).eq("id", user.id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile picture updated." };
}

export async function completeOnboardingAction() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
  redirect("/dashboard");
}

/** Business status (everyone chooses their own) and NeoLife ID (seen by the member's sponsor line, never their downline). */
export async function saveBusinessAction(_prev: ProfileState, formData: FormData): Promise<ProfileState> {
  const parsed = z.object({
    business_rank: z.enum(RANK_KEYS as [string, ...string[]]).or(z.literal("")),
    newlife_id: z.string().trim().max(40).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check your status and NeoLife ID." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("profiles").update({ business_rank: parsed.data.business_rank || null }).eq("id", user.id);
  if (error) return { ok: false, message: friendlyError(error) };
  const nl = parsed.data.newlife_id || null;
  const { data: existing } = await supabase.from("member_private").select("user_id").eq("user_id", user.id).maybeSingle();
  const { error: idErr } = existing
    ? await supabase.from("member_private").update({ newlife_id: nl }).eq("user_id", user.id)
    : nl ? await supabase.from("member_private").insert({ newlife_id: nl }) : { error: null };
  if (idErr) return { ok: false, message: friendlyError(idErr) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved." };
}
