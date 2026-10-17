"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/academy";
import { friendlyError } from "@/lib/utils";

export type ContentState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const categoryKeys = CATEGORIES.map((c) => c.key) as [string, ...string[]];

export async function saveCourseAction(_prev: ContentState, formData: FormData): Promise<ContentState> {
  const parsed = z.object({
    id: z.string().uuid().optional().or(z.literal("")),
    title: z.string().trim().min(3, "Add a title").max(160),
    category: z.enum(categoryKeys),
    description: z.string().trim().max(2000).optional(),
    level: z.enum(["beginner", "intermediate", "advanced"]),
    status: z.enum(["draft", "coming_soon", "published"]),
    sort_order: z.coerce.number().int().min(0).max(999).default(0),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const { id, ...v } = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let thumbnail_url: string | undefined;
  const file = formData.get("thumbnail");
  if (file instanceof File && file.size > 0) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      return { ok: false, message: "Thumbnails must be JPG, PNG or WebP under 5 MB." };
    }
    const path = `thumbnails/${crypto.randomUUID()}.${file.type.split("/")[1].replace("jpeg", "jpg")}`;
    const { error: upErr } = await supabase.storage.from("academy").upload(path, file, { contentType: file.type });
    if (upErr) return { ok: false, message: "Thumbnail upload failed." };
    thumbnail_url = supabase.storage.from("academy").getPublicUrl(path).data.publicUrl;
  }

  const row = { ...v, description: v.description || null, ...(thumbnail_url ? { thumbnail_url } : {}) };
  const slug = v.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60) || crypto.randomUUID().slice(0, 8);
  const { error } = id
    ? await supabase.from("courses").update(row).eq("id", id)
    : await supabase.from("courses").insert({ ...row, slug: `${slug}-${crypto.randomUUID().slice(0, 4)}`, created_by: user?.id });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/admin/content");
  revalidatePath("/academy", "layout");
  return { ok: true, message: id ? "Course updated." : "Course created." };
}

export async function saveLessonAction(_prev: ContentState, formData: FormData): Promise<ContentState> {
  const url = z.string().trim().url("Enter a full https:// link").startsWith("https://", "Use an https:// link").optional().or(z.literal(""));
  const parsed = z.object({
    course_id: z.string().uuid(),
    title: z.string().trim().min(2, "Add a title").max(160),
    content: z.string().max(50000).optional(),
    video_url: url,
    resource_url: url,
    duration_minutes: z.coerce.number().int().min(0).max(600).optional(),
    sort_order: z.coerce.number().int().min(0).max(999).default(0),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("lessons").insert({
    ...v, content: v.content || null, video_url: v.video_url || null, resource_url: v.resource_url || null,
    duration_minutes: v.duration_minutes || null,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/admin/content");
  revalidatePath("/academy", "layout");
  return { ok: true, message: "Lesson added." };
}

export async function deleteLessonAction(id: string) {
  const supabase = await createClient();
  await supabase.from("lessons").delete().eq("id", id);
  revalidatePath("/admin/content");
  revalidatePath("/academy", "layout");
}

export async function saveKnowledgeAction(_prev: ContentState, formData: FormData): Promise<ContentState> {
  const parsed = z.object({
    title: z.string().trim().min(3, "Add a title").max(200),
    category: z.string().trim().min(2).max(60).default("general"),
    content: z.string().trim().min(10, "Add the approved content").max(50000),
    source: z.string().trim().max(200).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("approved_knowledge").insert({ ...parsed.data, source: parsed.data.source || null, created_by: user?.id });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/admin/content");
  return { ok: true, message: "Added to the approved knowledge base. Maximus AI will use it from now on." };
}

export async function toggleKnowledgeAction(id: string, published: boolean) {
  const supabase = await createClient();
  await supabase.from("approved_knowledge").update({ is_published: published }).eq("id", id);
  revalidatePath("/admin/content");
}
