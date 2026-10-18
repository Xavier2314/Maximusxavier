"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function toggleChecklistAction(itemId: string, date: string, done: boolean) {
  const viewer = await requireViewer();
  const p = z.object({ itemId: z.string().uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse({ itemId, date });
  if (!p.success) return;
  const supabase = await createClient();
  if (done) await supabase.from("checklist_checks").insert({ user_id: viewer.id, item_id: p.data.itemId, check_date: p.data.date });
  else await supabase.from("checklist_checks").delete().eq("user_id", viewer.id).eq("item_id", p.data.itemId).eq("check_date", p.data.date);
  revalidatePath("/dashboard");
}
