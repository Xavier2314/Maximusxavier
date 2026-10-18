"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type TeamActionState = { ok: boolean; message: string } | null;

/** An upline adds a profile photo for someone in their downline. Storage RLS and set_member_photo() check the right. */
export async function uploadMemberPhotoAction(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const target = z.string().uuid().safeParse(formData.get("member_id"));
  const file = formData.get("photo");
  if (!target.success) return { ok: false, message: "Invalid member." };
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose a photo." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { ok: false, message: "Use a JPG, PNG or WebP image." };
  if (file.size > 2 * 1024 * 1024) return { ok: false, message: "Photos must be under 2 MB." };

  const supabase = await createClient();
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${target.data}/avatar-${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: true });
  if (upErr) return { ok: false, message: "You can only add photos for people in your team." };
  const { data } = supabase.storage.from("avatars").getPublicUrl(path);
  const { error } = await supabase.rpc("set_member_photo", { p_target: target.data, p_url: data.publicUrl });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/team", "layout");
  return { ok: true, message: "Photo added." };
}

/** Removes someone who left. People in their team who didn't leave move under the remover. */
export async function removeFromTeamAction(_prev: TeamActionState, formData: FormData): Promise<TeamActionState> {
  const parsed = z.object({
    member_id: z.string().uuid(),
    reason: z.string().trim().max(300).optional(),
    confirm: z.literal("on", { errorMap: () => ({ message: "Tick the box to confirm." }) }),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const leaving = formData.getAll("also_leaving").map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x));

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("remove_from_team", {
    p_target: parsed.data.member_id, p_also_leaving: leaving, p_reason: parsed.data.reason || null,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  const r = data as { removed: number; moved: number };
  revalidatePath("/team", "layout");
  revalidatePath("/office", "layout");
  redirect(`/team?removed=${r.removed}&moved=${r.moved}`);
}

/** Super Admin only: put a member in their correct office. */
export async function setMemberOfficeAction(memberId: string, officeId: string): Promise<TeamActionState> {
  const ids = z.object({ memberId: z.string().uuid(), officeId: z.string().uuid() }).safeParse({ memberId, officeId });
  if (!ids.success) return { ok: false, message: "Choose an office." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_office", { p_target: memberId, p_office: officeId });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/office", "layout");
  return { ok: true, message: "Office updated." };
}
