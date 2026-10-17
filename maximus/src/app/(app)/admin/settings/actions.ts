"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

const int = (min: number, max: number) => z.coerce.number().int().min(min).max(max);

export async function saveActiveDefinitionAction(_prev: { ok: boolean; message: string } | null, formData: FormData) {
  const parsed = z.object({
    window_days: int(7, 120), min_attendance_days: int(0, 120), min_prospects: int(0, 10000),
    min_orders: int(0, 10000), min_evaluations: int(0, 30),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Enter whole numbers within the allowed ranges." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("app_settings").upsert({
    key: "active_member_definition",
    value: { ...parsed.data, require_all: formData.get("require_all") === "on" },
    updated_by: user?.id, updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/admin/settings");
  return { ok: true, message: "Active member definition saved." };
}
