"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { POSITION_KEYS } from "@/lib/positions";
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

/**
 * Switch a member's position in one step (e.g. Admin → Super Admin): grant the new
 * position, then remove the others. assign_role/revoke_role enforce who may do what.
 */
export async function setPositionAction(userId: string, position: string, earningsManager: boolean): Promise<Result> {
  if (position !== "none" && !(POSITION_KEYS as string[]).includes(position)) return { ok: false, message: "Choose a position." };
  const supabase = await createClient();
  const { data: rows } = await supabase.from("user_roles").select("roles(key)").eq("user_id", userId);
  const held = new Set(((rows ?? []) as unknown as { roles: { key: string } | null }[]).map((r) => r.roles?.key).filter(Boolean) as string[]);

  if (position !== "none" && !held.has(position)) {
    const { error } = await supabase.rpc("assign_role", { target: userId, role_key: position });
    if (error) return { ok: false, message: friendlyError(error) };
  }
  for (const key of POSITION_KEYS.filter((k) => k !== position && held.has(k))) {
    const { error } = await supabase.rpc("revoke_role", { target: userId, role_key: key });
    if (error) return { ok: false, message: friendlyError(error) };
  }
  if (earningsManager !== held.has("earnings_manager")) {
    const { error } = earningsManager
      ? await supabase.rpc("assign_role", { target: userId, role_key: "earnings_manager" })
      : await supabase.rpc("revoke_role", { target: userId, role_key: "earnings_manager" });
    if (error) return { ok: false, message: friendlyError(error) };
  }
  revalidatePath("/admin/members", "layout");
  revalidatePath(`/team/${userId}`);
  return { ok: true, message: "Role updated. It applies the next time they open the app." };
}
