"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type WhyState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const whySchema = z.object({
  id: z.string().uuid().optional(),
  category: z.enum(["financial", "family", "career", "personal", "reason", "milestone"]),
  title: z.string().trim().min(1, "Give it a short title").max(120),
  body: z.string().trim().max(2000).optional(),
  target_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  shared: z.enum(["on"]).optional(),
  show_on_dashboard: z.enum(["on"]).optional(),
  remove_image: z.enum(["on"]).optional(),
});

/** Save one of the member's reasons. Private unless they tick "share". */
export async function saveWhyAction(_prev: WhyState, formData: FormData): Promise<WhyState> {
  const parsed = whySchema.safeParse(Object.fromEntries([...formData.entries()].filter(([k]) => k !== "image")));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  let image_path: string | null | undefined = v.remove_image ? null : undefined;
  const file = formData.get("image");
  if (file instanceof File && file.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return { ok: false, message: "Use a JPG, PNG or WebP image." };
    if (file.size > 3 * 1024 * 1024) return { ok: false, message: "Images must be under 3 MB." };
    const path = `${user.id}/why-${Date.now()}.jpg`;
    const { error } = await supabase.storage.from("motivations").upload(path, file, { contentType: file.type });
    if (error) return { ok: false, message: "The picture couldn't be uploaded. Please try again." };
    image_path = path;
  }

  const row = {
    category: v.category, title: v.title, body: v.body || null, target_date: v.target_date || null,
    shared: Boolean(v.shared), show_on_dashboard: Boolean(v.show_on_dashboard),
    ...(image_path !== undefined ? { image_path } : {}),
  };
  const { error } = v.id
    ? await supabase.from("motivations").update(row).eq("id", v.id)
    : await supabase.from("motivations").insert(row);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/why");
  revalidatePath("/dashboard");
  return { ok: true, message: v.id ? "Saved." : "Added to My Why." };
}

export async function deleteWhyAction(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("motivations").delete().eq("id", id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/why");
  revalidatePath("/dashboard");
  return { ok: true, message: "Removed." };
}

/** A leader sends a kind word about something the member chose to share. */
export async function encourageAction(motivationId: string, message: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("encourage_member", { p_motivation: motivationId, p_message: message });
  if (error) return { ok: false, message: friendlyError(error) };
  return { ok: true, message: "Sent. They'll get a notification." };
}
