"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function addThoughtAction(formData: FormData) {
  await requirePermission("manage_content");
  const p = z.object({
    body: z.string().trim().min(5).max(500), author: z.string().trim().max(120).optional(),
    show_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }).safeParse(Object.fromEntries(formData));
  if (!p.success) return;
  const supabase = await createClient();
  await supabase.from("daily_thoughts").upsert({ body: p.data.body, author: p.data.author || null, show_on: p.data.show_on }, { onConflict: "show_on" });
  revalidatePath("/admin/daily");
}

export async function addChecklistItemAction(formData: FormData) {
  await requirePermission("manage_content");
  const title = z.string().trim().min(2).max(120).safeParse(formData.get("title"));
  if (!title.success) return;
  const supabase = await createClient();
  const { count } = await supabase.from("checklist_items").select("id", { count: "exact", head: true });
  await supabase.from("checklist_items").insert({ title: title.data, sort_order: (count ?? 0) + 1 });
  revalidatePath("/admin/daily");
}

export async function toggleChecklistItemAction(formData: FormData) {
  await requirePermission("manage_content");
  const p = z.object({ id: z.string().uuid(), active: z.enum(["true", "false"]) }).safeParse(Object.fromEntries(formData));
  if (!p.success) return;
  const supabase = await createClient();
  await supabase.from("checklist_items").update({ is_active: p.data.active === "true" }).eq("id", p.data.id);
  revalidatePath("/admin/daily");
}
