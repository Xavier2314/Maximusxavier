"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type Result = { ok: boolean; message: string };

export async function setRoleAction(userId: string, role: string, grant: boolean): Promise<Result> {
  const supabase = await createClient();
  const { error } = grant
    ? await supabase.rpc("assign_role", { target: userId, role_key: role })
    : await supabase.rpc("revoke_role", { target: userId, role_key: role });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/admin/members/${userId}`);
  return { ok: true, message: grant ? "Role granted." : "Role removed." };
}

export async function setStatusAction(userId: string, status: "active" | "suspended" | "deactivated"): Promise<Result> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_member_status", { target: userId, new_status: status });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/admin/members/${userId}`);
  return { ok: true, message: `Member ${status}.` };
}

export async function changeSponsorAction(userId: string, sponsorCode: string): Promise<Result> {
  const supabase = await createClient();
  const code = sponsorCode.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
  let sponsorId: string | null = null;
  if (code) {
    const { data } = await supabase.from("profiles").select("id").or(`member_id.ilike.${code},referral_code.ilike.${code}`).maybeSingle();
    if (!data) return { ok: false, message: "No member found with that Member ID or referral code." };
    sponsorId = data.id as string;
  }
  const { error } = await supabase.rpc("change_sponsor", { target: userId, new_sponsor: sponsorId });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/admin/members/${userId}`);
  return { ok: true, message: "Sponsor updated and team tree rebuilt." };
}

export async function setHomeOfficeAction(userId: string, officeId: string): Promise<Result> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // Home office assignment goes through office memberships (office managers' RLS applies).
  const { error } = await supabase.from("office_memberships").upsert({ office_id: officeId, user_id: userId, assigned_by: user?.id });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/admin/members/${userId}`);
  return { ok: true, message: "Office assigned." };
}
