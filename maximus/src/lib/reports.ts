import { addDays } from "@/lib/planner";
import { addMonths, monthStart } from "@/lib/utils";

export type AttendanceRow = {
  member: string; full_name: string; member_code: string; avatar_url: string | null;
  open_days: number; present_days: number; late_days: number; absent_days: number;
  attendance_pct: number | null; absent_streak: number; last_check_in: string | null; last_activity: string | null;
};

export const RANGES = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "month", label: "This month" },
  { key: "last-month", label: "Last month" },
] as const;

/** Resolve a preset or custom range to [from, to] dates (inclusive). */
export function resolveRange(today: string, range?: string, from?: string, to?: string): { key: string; from: string; to: string } {
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (from && to && iso.test(from) && iso.test(to) && from <= to) return { key: "custom", from, to };
  switch (range) {
    case "7d": return { key: "7d", from: addDays(today, -6), to: today };
    case "month": return { key: "month", from: monthStart(today), to: today };
    case "last-month": { const m = addMonths(monthStart(today), -1); return { key: "last-month", from: m, to: addDays(monthStart(today), -1) }; }
    default: return { key: "30d", from: addDays(today, -29), to: today };
  }
}

export const ALERT_KINDS: Record<string, { label: string; tip: string }> = {
  absences: { label: "Missing office days", tip: "Call to check they're okay and invite them to the next session." },
  no_prospecting: { label: "Stopped prospecting", tip: "Sit with them for 20 minutes and list 10 people to contact together." },
  no_goals: { label: "No goals this month", tip: "Help them set one small, clear target for the month." },
  no_evaluation: { label: "Evaluations behind", tip: "Remind them gently and do the next evaluation together." },
  training: { label: "Paused training", tip: "Share one short Academy lesson that fits what they're working on." },
  improving: { label: "Big improvement", tip: "Recognise it publicly. Momentum grows when it's noticed." },
};

export type Alert = { member: string; full_name: string; avatar_url: string | null; kind: string; detail: string; positive: boolean };

/** Group alerts per member, most alerts first. */
export function groupAlerts(alerts: Alert[]) {
  const by = new Map<string, { member: string; full_name: string; avatar_url: string | null; items: Alert[] }>();
  for (const a of alerts) {
    const g = by.get(a.member) ?? { member: a.member, full_name: a.full_name, avatar_url: a.avatar_url, items: [] };
    g.items.push(a);
    by.set(a.member, g);
  }
  return [...by.values()].sort((a, b) => b.items.length - a.items.length || a.full_name.localeCompare(b.full_name));
}
