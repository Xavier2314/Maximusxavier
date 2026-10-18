import type { RoleKey } from "@/lib/types";

/** Leadership positions, lowest to highest. A member holds at most one; Sponsor/Upline/Downline stay automatic. */
export const POSITIONS: { key: RoleKey | "none"; label: string }[] = [
  { key: "none", label: "Member" },
  { key: "team_leader", label: "Team Leader" },
  { key: "director", label: "Director" },
  { key: "office_admin", label: "Office Admin" },
  { key: "executive_admin", label: "Admin" },
  { key: "super_admin", label: "Super Admin" },
];
export const POSITION_KEYS = POSITIONS.map((p) => p.key).filter((k) => k !== "none") as RoleKey[];

/** The highest position a member holds. */
export function currentPosition(roles: string[]): RoleKey | "none" {
  return [...POSITION_KEYS].reverse().find((k) => roles.includes(k)) ?? "none";
}
