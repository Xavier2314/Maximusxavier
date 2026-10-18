export const TASK_CATEGORIES = [
  { key: "prospecting", label: "Prospecting" },
  { key: "follow_up", label: "Follow-up" },
  { key: "sales", label: "Sales" },
  { key: "training", label: "Training" },
  { key: "team", label: "Team" },
  { key: "personal", label: "Personal" },
  { key: "other", label: "Other" },
] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number]["key"];

export const PRIORITIES = [
  { key: 1, label: "High" },
  { key: 2, label: "Normal" },
  { key: 3, label: "Low" },
] as const;

export type Task = {
  id: string; user_id: string; title: string; notes: string | null; category: TaskCategory; priority: 1 | 2 | 3;
  due_date: string | null; repeat: "none" | "daily" | "weekly"; completed_at: string | null; assigned_by: string | null;
  created_at: string;
};

export const WHY_CATEGORIES = [
  { key: "reason", label: "Why I joined", emoji: "🔥" },
  { key: "family", label: "Family", emoji: "🏡" },
  { key: "financial", label: "Financial goal", emoji: "💰" },
  { key: "career", label: "Career", emoji: "🚀" },
  { key: "personal", label: "Personal ambition", emoji: "🌱" },
  { key: "milestone", label: "Milestone", emoji: "🏆" },
] as const;
export type WhyCategory = (typeof WHY_CATEGORIES)[number]["key"];

export type Motivation = {
  id: string; user_id: string; category: WhyCategory; title: string; body: string | null; image_path: string | null;
  target_date: string | null; shared: boolean; show_on_dashboard: boolean; created_at: string;
};

export function addDays(isoDate: string, n: number): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
