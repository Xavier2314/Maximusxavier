"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

const INTERESTS = ["account", "savings", "transfers", "commissions", "bills", "cards"] as const;

export async function joinBankWaitlistAction(formData: FormData) {
  const viewer = await requireViewer();
  const interests = z.array(z.enum(INTERESTS)).catch([]).parse(formData.getAll("interests"));
  const supabase = await createClient();
  await supabase.from("bank_waitlist").upsert({ user_id: viewer.id, interests });
  revalidatePath("/bank");
}

export async function leaveBankWaitlistAction() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  await supabase.from("bank_waitlist").delete().eq("user_id", viewer.id);
  revalidatePath("/bank");
}
