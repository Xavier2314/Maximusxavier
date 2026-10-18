import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Permission, Profile, RoleKey } from "@/lib/types";

export type Viewer = {
  id: string;
  email: string;
  profile: Profile;
  roles: RoleKey[];
  permissions: Set<Permission>;
  can: (p: Permission) => boolean;
  isLeader: boolean;
  isAdmin: boolean;
  /** Offices this member manages (every office for organisation admins). */
  offices: { id: string; name: string }[];
  /** Has an Office view: manages an office, leads a team or approves payments. */
  hasOfficeView: boolean;
};

/**
 * The signed-in member, their roles and permissions — loaded once per request.
 * UI checks use this for convenience only; every rule is also enforced by
 * Postgres RLS and server functions.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: perms }, { data: roleRows }, { data: offices }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single<Profile>(),
    supabase.rpc("my_permissions"),
    supabase.from("user_roles").select("roles(key)").eq("user_id", user.id),
    supabase.rpc("my_managed_offices"),
  ]);
  if (!profile) return null;

  const permissions = new Set<Permission>(((perms as string[] | null) ?? []) as Permission[]);
  const roles = ((roleRows ?? []) as unknown as { roles: { key: RoleKey } | null }[])
    .map((r) => r.roles?.key)
    .filter((k): k is RoleKey => Boolean(k));

  const managed = ((offices as { id: string; name: string }[] | null) ?? []);
  const isLeader = permissions.has("view_team_dashboard") || permissions.has("view_direct_downlines");
  return {
    id: user.id,
    email: user.email ?? profile.email,
    profile,
    roles,
    permissions,
    can: (p) => permissions.has(p),
    isLeader,
    isAdmin: permissions.has("view_org_analytics"),
    offices: managed,
    hasOfficeView: managed.length > 0 || isLeader || permissions.has("approve_financial_transactions") || permissions.has("view_org_analytics"),
  };
});

export async function requireViewer(): Promise<Viewer> {
  const viewer = await getViewer();
  if (!viewer) redirect("/login");
  return viewer;
}

/** Page guard: renders the 403 page when the permission is missing. */
export async function requirePermission(permission: Permission): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!viewer.can(permission)) redirect("/forbidden");
  return viewer;
}

export const ROLE_LABELS: Record<RoleKey, string> = {
  member: "Member",
  downline: "Downline",
  upline: "Upline",
  sponsor: "Sponsor",
  team_leader: "Team Leader",
  earnings_manager: "Earnings Manager",
  director: "Director",
  office_admin: "Office Admin",
  executive_admin: "Executive Admin",
  super_admin: "Super Admin",
};

/** The most senior role, for display. */
export function primaryRole(roles: RoleKey[]): RoleKey {
  const order: RoleKey[] = ["super_admin", "executive_admin", "office_admin", "director", "team_leader", "earnings_manager", "upline", "sponsor", "downline", "member"];
  return order.find((r) => roles.includes(r)) ?? "member";
}
