"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type FormState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
const num = (min: number, max: number, msg: string) =>
  z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number({ invalid_type_error: msg }).min(min, msg).max(max, msg));

const officeSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  name: z.string().trim().min(2, "Enter the office name").max(120),
  address: z.string().trim().max(300).optional(),
  latitude: num(-90, 90, "Latitude must be between -90 and 90"),
  longitude: num(-180, 180, "Longitude must be between -180 and 180"),
  radius_m: num(10, 5000, "Radius must be between 10 and 5000 metres"),
  timezone: z.string().trim().min(3).max(64).default("Africa/Lagos"),
  opens: z.string().regex(/^\d{2}:\d{2}$/).default("08:00"),
  closes: z.string().regex(/^\d{2}:\d{2}$/).default("17:00"),
  is_active: z.string().optional(),
});

export async function saveOfficeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = officeSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const schedule = Object.fromEntries(DAYS.filter((d) => formData.get(`day_${d}`) === "on").map((d) => [d, { open: v.opens, close: v.closes }]));
  const row = {
    name: v.name, address: v.address || null, latitude: v.latitude, longitude: v.longitude, radius_m: v.radius_m,
    timezone: v.timezone, schedule, is_active: v.is_active === "on",
  };
  const supabase = await createClient();
  const { error } = v.id
    ? await supabase.from("offices").update(row).eq("id", v.id)
    : await supabase.from("offices").insert(row);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/admin/offices");
  return { ok: true, message: v.id ? "Office updated." : "Office created." };
}

export async function assignMemberAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const officeId = z.string().uuid().safeParse(formData.get("office_id"));
  const memberCode = z.string().trim().min(3).safeParse(formData.get("member_code"));
  if (!officeId.success || !memberCode.success) return { ok: false, message: "Enter a Member ID." };
  const supabase = await createClient();
  const { data: member } = await supabase.from("profiles").select("id, full_name").ilike("member_id", memberCode.data).maybeSingle();
  if (!member) return { ok: false, message: "No member with that ID is visible to you." };
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase.from("office_memberships").upsert({
    office_id: officeId.data, user_id: member.id, is_manager: formData.get("is_manager") === "on", assigned_by: user?.id,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/admin/offices");
  return { ok: true, message: `${member.full_name} assigned.` };
}

export async function removeMemberAction(officeId: string, userId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("office_memberships").delete().eq("office_id", officeId).eq("user_id", userId);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/admin/offices");
  return { ok: true, message: "Removed." };
}

export async function rotateQrAction(formData: FormData) {
  const id = z.string().uuid().safeParse(formData.get("office_id"));
  if (!id.success) return;
  const supabase = await createClient();
  await supabase.rpc("rotate_office_qr", { p_office: id.data });
  revalidatePath(`/admin/offices/${id.data}/qr`);
}
