"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export async function deleteConversationAction(id: string) {
  const supabase = await createClient();
  await supabase.from("ai_conversations").delete().eq("id", id);
  revalidatePath("/ai");
}

export async function addMemoryAction(content: string) {
  const parsed = z.string().trim().min(3).max(500).safeParse(content);
  if (!parsed.success) return { ok: false, message: "Memories must be 3–500 characters." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("ai_memories").insert({ user_id: user?.id, content: parsed.data });
  if (error) return { ok: false, message: friendlyError(error, "Turn on AI memory in Settings first.") };
  revalidatePath("/ai");
  return { ok: true, message: "Saved to memory." };
}

export async function deleteMemoryAction(id: string | null) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const q = supabase.from("ai_memories").delete().eq("user_id", user.id);
  await (id ? q.eq("id", id) : q);
  revalidatePath("/ai");
}
