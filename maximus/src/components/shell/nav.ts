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
      { href: "/tools", label: "Tools", icon: "timer" },
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

/** Team view: leading a downline, independent of any office affiliation. Shown to anyone who leads a team. */
export const TEAM_NAV: NavSection[] = [
  {
    title: "Team",
    items: [
      { href: "/office/team", label: "Team overview", icon: "network", anyPermission: ["view_team_dashboard", "view_direct_downlines"] },
      { href: "/office/alerts", label: "Coaching alerts", icon: "bell", anyPermission: ["manage_office", "view_team_dashboard", "view_direct_downlines", "view_org_analytics"] },
      { href: "/office/place", label: "Place in an office", icon: "building", roles: ["super_admin", "team_leader"] },
    ],
  },
];

/** Office view: the office itself — its dashboard, roster, and (for managers) its settings. */
export const OFFICE_NAV: NavSection[] = [
  {
    title: "Office",
    items: [
      { href: "/office", label: "Office overview", icon: "chart", anyPermission: ["manage_office", "view_org_analytics", "view_team_dashboard", "view_direct_downlines"] },
      { href: "/office/members", label: "Office members", icon: "users", anyPermission: ["manage_office", "view_org_analytics", "view_team_dashboard", "view_direct_downlines"] },
      { href: "/attendance/live", label: "Live attendance", icon: "map-pin", anyPermission: ["manage_office", "approve_attendance_exceptions", "view_org_analytics"] },
      { href: "/attendance/register", label: "Attendance register", icon: "clipboard", anyPermission: ["manage_office", "view_team_dashboard", "view_direct_downlines", "view_org_analytics"] },
      { href: "/office/weekly", label: "Weekly office report", icon: "clipboard", anyPermission: ["manage_office", "view_org_analytics"] },
      { href: "/office/reports", label: "Attendance reports", icon: "chart", anyPermission: ["manage_office", "view_org_analytics"] },
      { href: "/admin/approvals", label: "Approvals", icon: "check", anyPermission: ["approve_financial_transactions", "approve_attendance_exceptions", "manage_office"] },
      { href: "/admin/offices", label: "Office setup & QR", icon: "building", permission: "manage_office" },
      { href: "/office/brand", label: "Branding", icon: "palette", anyPermission: ["manage_office", "view_org_analytics"] },
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

/** Paths that belong to the Team view. Checked before the Office paths, since they share the "/office/" prefix. */
export const TEAM_PATHS = ["/office/team", "/office/alerts", "/office/place"];
export const isTeamPath = (pathname: string) =>
  TEAM_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

/** Paths that belong to the Office view (the switch and sidebar follow these). */
export const OFFICE_PATHS = ["/office", "/admin", "/attendance/live", "/attendance/register"];
export const isOfficePath = (pathname: string) =>
  !isTeamPath(pathname) && OFFICE_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export const BOTTOM_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/planner", label: "Planner", icon: "list-checks" },
  { href: "/attendance", label: "Check in", icon: "map-pin" },
  { href: "/tools", label: "Tools", icon: "timer" },
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

/** Team-view sections: downline/coaching tools for anyone who leads a team. */
export function visibleTeamNav(perms: Set<string>, roles: string[] = []): NavSection[] {
  return filterNav(TEAM_NAV, perms, roles);
}

/**
 * Office-view sections. Each item is already permission-gated for the right audience:
 * office managers see the full set (including settings/branding/QR), and team leaders see
 * the read-only subset their permissions unlock (overview, roster, live/attendance, approvals).
 */
export function visibleOfficeNav(perms: Set<string>, roles: string[] = []): NavSection[] {
  return filterNav(OFFICE_NAV, perms, roles);
}

/** Shortcuts used by the "+ New" menu and search. */
export const QUICK_ACTIONS: { href: string; label: string; icon: string; keywords?: string }[] = [
  { href: "/attendance", label: "Check in", icon: "map-pin", keywords: "attendance office arrive" },
  { href: "/planner", label: "Add a task", icon: "list-checks", keywords: "todo plan today reminder" },
  { href: "/why", label: "My Why", icon: "heart", keywords: "motivation reason dream family" },
  { href: "/tools/pomodoro", label: "Start a focus timer", icon: "timer", keywords: "pomodoro focus deep work countdown stopwatch" },
  { href: "/tools/habits", label: "Tick a habit", icon: "timer", keywords: "habit streak routine" },
  { href: "/prospects", label: "Add a prospect", icon: "funnel", keywords: "lead contact invite" },
  { href: "/orders", label: "Record an order", icon: "bag", keywords: "fiverr upwork sale screenshot" },
  { href: "/evaluations/new", label: "Complete evaluation", icon: "clipboard", keywords: "5 day report" },
  { href: "/finance", label: "Submit a payment", icon: "wallet", keywords: "savings deposit receipt contribution" },
  { href: "/goals/new", label: "Set monthly goals", icon: "target", keywords: "plan target" },
  { href: "/support", label: "Make a complaint", icon: "lifebuoy", keywords: "help problem report" },
];
