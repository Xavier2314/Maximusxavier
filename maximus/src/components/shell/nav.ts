import type { Permission } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: string; // lucide icon name, resolved in nav-icons.tsx
  permission?: Permission;
  anyPermission?: Permission[];
};

export type NavSection = { title?: string; items: NavItem[] };

export const NAV: NavSection[] = [
  {
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "home" },
      { href: "/team", label: "My Team", icon: "network" },
      { href: "/prospects", label: "Prospects", icon: "funnel" },
      { href: "/inbox", label: "Inbox", icon: "inbox" },
      { href: "/attendance", label: "Attendance", icon: "map-pin" },
      { href: "/goals", label: "Goals", icon: "target" },
      { href: "/evaluations", label: "Evaluations", icon: "clipboard" },
      { href: "/finance", label: "Finance", icon: "wallet" },
      { href: "/orders", label: "Orders", icon: "bag" },
      { href: "/bank", label: "Maximus Bank", icon: "landmark" },
    ],
  },
  {
    title: "Grow",
    items: [
      { href: "/growth", label: "Growth focus", icon: "compass" },
      { href: "/leaderboard", label: "Leaderboard", icon: "medal" },
      { href: "/ai", label: "Maximus AI", icon: "sparkles" },
      { href: "/academy", label: "Academy", icon: "graduation" },
      { href: "/recognition", label: "Recognition", icon: "trophy" },
      { href: "/announcements", label: "Announcements", icon: "megaphone" },
      { href: "/support", label: "Help & complaints", icon: "lifebuoy" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin", label: "Overview", icon: "chart", permission: "view_org_analytics" },
      { href: "/admin/members", label: "Members & roles", icon: "users", anyPermission: ["manage_roles", "view_org_analytics"] },
      { href: "/admin/offices", label: "Offices", icon: "building", permission: "manage_office" },
      { href: "/admin/approvals", label: "Approvals", icon: "check", anyPermission: ["approve_financial_transactions", "approve_attendance_exceptions"] },
      { href: "/admin/content", label: "Content", icon: "book", permission: "manage_content" },
      { href: "/admin/daily", label: "Checklist & thoughts", icon: "clipboard", permission: "manage_content" },
      { href: "/admin/settings", label: "Settings", icon: "sliders", permission: "manage_roles" },
      { href: "/admin/support", label: "Support tickets", icon: "lifebuoy", permission: "view_org_analytics" },
      { href: "/admin/audit", label: "Audit log", icon: "scroll", permission: "view_org_analytics" },
    ],
  },
];

export const BOTTOM_NAV: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: "home" },
  { href: "/team", label: "Team", icon: "network" },
  { href: "/attendance", label: "Check in", icon: "map-pin" },
  { href: "/goals", label: "Goals", icon: "target" },
];

export function visibleNav(perms: Set<string>): NavSection[] {
  const allowed = (i: NavItem) =>
    (!i.permission || perms.has(i.permission)) && (!i.anyPermission || i.anyPermission.some((p) => perms.has(p)));
  return NAV.map((s) => ({ ...s, items: s.items.filter(allowed) })).filter((s) => s.items.length > 0);
}

/** Shortcuts used by the "+ New" menu and search. */
export const QUICK_ACTIONS: { href: string; label: string; icon: string; keywords?: string }[] = [
  { href: "/attendance", label: "Check in", icon: "map-pin", keywords: "attendance office arrive" },
  { href: "/prospects", label: "Add a prospect", icon: "funnel", keywords: "lead contact invite" },
  { href: "/orders", label: "Record an order", icon: "bag", keywords: "fiverr upwork sale screenshot" },
  { href: "/evaluations/new", label: "Complete evaluation", icon: "clipboard", keywords: "5 day report" },
  { href: "/finance", label: "Submit a payment", icon: "wallet", keywords: "savings deposit receipt contribution" },
  { href: "/goals/new", label: "Set monthly goals", icon: "target", keywords: "plan target" },
  { href: "/support", label: "Make a complaint", icon: "lifebuoy", keywords: "help problem report" },
];
