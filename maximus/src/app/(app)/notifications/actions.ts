"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markReadAction(ids: string[] | null) {
  const supabase = await createClient();
  await supabase.rpc("mark_notifications_read", { p_ids: ids });
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
