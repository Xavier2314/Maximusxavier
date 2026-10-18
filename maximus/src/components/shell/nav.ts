import type { Permission } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: string; // lucide icon name, resolved in nav-icons.tsx
  permission?: Permission;
  anyPermission?: Permission[];
  /** Shown only to members holding one of these roles. */
  roles?: string[];
};

export type NavSection = { title?: string; items: NavItem[] };

/** My view: the member's own work. Everyone has this. */
export const NAV: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Home", icon: "home" },
      { href: "/planner", label: "Daily planner", icon: "list-checks" },
      { href: "/attendance", label: "Check in", icon: "map-pin" },
      { href: "/goals", label: "Goals", icon: "target" },
      { href: "/evaluations", label: "Evaluations", icon: "clipboard" },
      { href: "/prospects", label: "Prospects", icon: "funnel" },
      { href: "/team", label: "My Team", icon: "network" },
      { href: "/inbox", label: "Inbox", icon: "inbox" },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/finance", label: "Savings & payments", icon: "wallet" },
      { href: "/orders", label: "Orders", icon: "bag" },
      { href: "/bank", label: "Maximus Bank", icon: "landmark" },
    ],
  },
  {
    title: "Grow",
    items: [
      { href: "/why", label: "My Why", icon: "heart" },
      { href: "/growth", label: "Growth focus", icon: "compass" },
      { href: "/leaderboard", label: "Leaderboard", icon: "medal" },
      { href: "/academy", label: "Academy", icon: "graduation" },
      { href: "/ai", label: "Maximus AI", icon: "sparkles" },
      { href: "/recognition", label: "Recognition", icon: "trophy" },
      { href: "/announcements", label: "Announcements", icon: "megaphone" },
      { href: "/support", label: "Help & complaints", icon: "lifebuoy" },
    ],
  },
];

/** Office view: running an office or leading a team. Shown only to those who can. */
export const OFFICE_NAV: NavSection[] = [
  {
    title: "Office",
    items: [
      { href: "/office", label: "Office overview", icon: "chart", anyPermission: ["manage_office", "view_org_analytics"] },
      { href: "/office/members", label: "Office members", icon: "users", anyPermission: ["manage_office", "view_org_analytics"] },
      { href: "/attendance/live", label: "Live attendance", icon: "map-pin", anyPermission: ["manage_office", "approve_attendance_exceptions", "view_org_analytics"] },
      { href: "/attendance/register", label: "Attendance register", icon: "clipboard", anyPermission: ["manage_office", "view_team_dashboard", "view_direct_downlines", "view_org_analytics"] },
      { href: "/office/reports", label: "Attendance reports", icon: "chart", anyPermission: ["manage_office", "view_org_analytics"] },
      { href: "/admin/approvals", label: "Approvals", icon: "check", anyPermission: ["approve_financial_transactions", "approve_attendance_exceptions", "manage_office"] },
      { href: "/admin/offices", label: "Office setup & QR", icon: "building", permission: "manage_office" },
      { href: "/office/brand", label: "Branding", icon: "palette", anyPermission: ["manage_office", "view_org_analytics"] },
    ],
  },
  {
    title: "Team",
    items: [
      { href: "/office/team", label: "Team overview", icon: "network", anyPermission: ["view_team_dashboard", "view_direct_downlines"] },
      { href: "/office/alerts", label: "Coaching alerts", icon: "bell", anyPermission: ["manage_office", "view_team_dashboard", "view_direct_downlines", "view_org_analytics"] },
      { href: "/office/place", label: "Place in an office", icon: "building", roles: ["super_admin", "team_leader"] },
    ],
  },
  {
    title: "Organisation",
    items: [
      { href: "/admin", label: "All offices", icon: "building", permission: "view_org_analytics" },
      { href: "/admin/members", label: "Members & roles", icon: "users", anyPermission: ["manage_roles", "view_org_analytics"] },
      { href: "/admin/content", label: "Content", icon: "book", permission: "manage_content" },
      { href: "/admin/daily", label: "Checklist & thoughts", icon: "clipboard", permission: "manage_content" },
      { href: "/admin/support", label: "Support tickets", icon: "lifebuoy", permission: "view_org_analytics" },
      { href: "/admin/settings", label: "Settings", icon: "sliders", permission: "manage_roles" },
      { href: "/admin/branding", label: "Platform branding", icon: "palette", roles: ["super_admin"] },
      { href: "/admin/white-label", label: "White-label payments", icon: "wallet", roles: ["super_admin"] },
      { href: "/admin/audit", label: "Audit log", icon: "scroll", permission: "view_org_analytics" },
    ],
  },
];

/** Paths that belong to the Office view (the switch and sidebar follow these). */
export const OFFICE_PATHS = ["/office", "/admin", "/attendance/live", "/attendance/register"];
export const isOfficePath = (pathname: string) =>
  OFFICE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const BOTTOM_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/planner", label: "Planner", icon: "list-checks" },
  { href: "/attendance", label: "Check in", icon: "map-pin" },
  { href: "/prospects", label: "Prospects", icon: "funnel" },
];

export const OFFICE_BOTTOM_NAV: NavItem[] = [
  { href: "/office", label: "Office", icon: "chart" },
  { href: "/office/members", label: "Members", icon: "users" },
  { href: "/attendance/live", label: "Live", icon: "map-pin" },
  { href: "/admin/approvals", label: "Approvals", icon: "check" },
];

function filterNav(nav: NavSection[], perms: Set<string>, roles: string[] = []): NavSection[] {
  const allowed = (i: NavItem) =>
    (!i.permission || perms.has(i.permission)) && (!i.anyPermission || i.anyPermission.some((p) => perms.has(p)))
    && (!i.roles || i.roles.some((r) => roles.includes(r)));
  return nav.map((s) => ({ ...s, items: s.items.filter(allowed) })).filter((s) => s.items.length > 0);
}

export function visibleNav(perms: Set<string>): NavSection[] {
  return filterNav(NAV, perms);
}

/** Office-view sections. Team leaders without an office get the Team part only. */
export function visibleOfficeNav(perms: Set<string>, managesOffice: boolean, roles: string[] = []): NavSection[] {
  const sections = filterNav(OFFICE_NAV, perms, roles);
  if (managesOffice) return sections;
  // Without an office, only Approvals is useful from the Office section (e.g. earnings managers).
  return sections
    .map((s) => (s.title === "Office" ? { ...s, items: s.items.filter((i) => i.href === "/admin/approvals") } : s))
    .filter((s) => s.items.length > 0);
}

/** Shortcuts used by the "+ New" menu and search. */
export const QUICK_ACTIONS: { href: string; label: string; icon: string; keywords?: string }[] = [
  { href: "/attendance", label: "Check in", icon: "map-pin", keywords: "attendance office arrive" },
  { href: "/planner", label: "Add a task", icon: "list-checks", keywords: "todo plan today reminder" },
  { href: "/why", label: "My Why", icon: "heart", keywords: "motivation reason dream family" },
  { href: "/prospects", label: "Add a prospect", icon: "funnel", keywords: "lead contact invite" },
  { href: "/orders", label: "Record an order", icon: "bag", keywords: "fiverr upwork sale screenshot" },
  { href: "/evaluations/new", label: "Complete evaluation", icon: "clipboard", keywords: "5 day report" },
  { href: "/finance", label: "Submit a payment", icon: "wallet", keywords: "savings deposit receipt contribution" },
  { href: "/goals/new", label: "Set monthly goals", icon: "target", keywords: "plan target" },
  { href: "/support", label: "Make a complaint", icon: "lifebuoy", keywords: "help problem report" },
];
