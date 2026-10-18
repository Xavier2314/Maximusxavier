"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requirePermission, requireViewer } from "@/lib/auth";
import { dispatchPushSoon } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

const schema = z.object({
  category: z.enum(["payment", "attendance", "team", "app_problem", "conduct", "other"]),
  message: z.string().trim().min(5, "Tell us a little more (at least 5 characters).").max(4000),
  page: z.string().max(200).optional(),
});

export async function submitComplaintAction(input: z.input<typeof schema>): Promise<{ ok: boolean; message: string }> {
  const viewer = await requireViewer();
  const p = schema.safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Invalid complaint." };
  const supabase = await createClient();
  const { error } = await supabase.from("support_tickets").insert({ ...p.data, user_id: viewer.id, page: p.data.page || null });
  if (error) return { ok: false, message: friendlyError(error) };
  dispatchPushSoon();
  revalidatePath("/support");
  return { ok: true, message: "Thank you. Your complaint was sent to the admin team. You'll be notified when they respond." };
}

export async function updateTicketAction(formData: FormData) {
  await requirePermission("view_org_analytics");
  const p = z.object({
    id: z.string().uuid(), status: z.enum(["open", "in_progress", "resolved"]), admin_note: z.string().trim().max(2000).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!p.success) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  await supabase.from("support_tickets").update({ status: p.data.status, admin_note: p.data.admin_note || null, handled_by: user?.id }).eq("id", p.data.id);
  dispatchPushSoon();
  revalidatePath("/admin/support");
}
