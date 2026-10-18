/** Weekly office report: the fields, laid out like the offices' own paper report. */

export type MetricDef = { key: string; label: string; money?: boolean; hint?: string };
export const METRIC_SECTIONS: { title: string | null; metrics: MetricDef[] }[] = [
  {
    title: null,
    metrics: [
      { key: "active_members", label: "Total Number of Active Members" },
      { key: "avg_attendance", label: "Average Attendance for the Week" },
      { key: "network_varsity", label: "Number of People at Network Varsity" },
      { key: "newbies", label: "Number of Newbies at the Office" },
      { key: "distributors", label: "Number of Distributors" },
      { key: "managers", label: "Number of Managers" },
      { key: "senior_managers", label: "Number of Senior Managers" },
      { key: "executive_managers", label: "Number of Executive Managers" },
    ],
  },
  {
    title: "New Orders / Contracts / Jobs Gotten",
    metrics: [
      { key: "orders", label: "Number of Orders / Contracts / Jobs Gotten" },
      { key: "ongoing_jobs", label: "Number of Ongoing Jobs", hint: "Hourly, milestones" },
      { key: "amount_earned", label: "Total Amount Earned", money: true },
      { key: "earners_newbies", label: "People who got orders: Newbies" },
      { key: "earners_probies", label: "People who got orders: Probies" },
      { key: "earners_distributors", label: "People who got orders: Distributors" },
    ],
  },
  {
    title: "Business Tools",
    metrics: [
      { key: "with_laptops", label: "Number of People with Laptops" },
      { key: "without_laptops", label: "Number of People without Laptops" },
    ],
  },
];
export const METRIC_KEYS = METRIC_SECTIONS.flatMap((s) => s.metrics.map((m) => m.key));

export type ServiceRow = { name: string; orders?: number | null; keywords?: string; gig_title?: string };
export type NewServiceRow = ServiceRow & { messages?: number | null };
export type ChallengeRow = { challenge: string; solution?: string };

export type OfficeReport = {
  id?: string;
  office_id: string;
  week_start: string;
  team_leaders: string | null;
  director: string | null;
  location: string | null;
  currency: "USD" | "NGN";
  metrics: Record<string, number | null>;
  services: ServiceRow[];
  new_services: NewServiceRow[];
  trainings_count: number | null;
  training_topics: string | null;
  timetable: string | null;
  fresh_updates: string | null;
  challenges: ChallengeRow[];
  notes: string | null;
  status?: "draft" | "submitted";
  submitted_at?: string | null;
};

/** Monday of the week containing an ISO date. */
export function weekStartOf(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() - (dow - 1));
  return d.toISOString().slice(0, 10);
}

export function formatMetric(v: number | null | undefined, money: boolean | undefined, currency: string): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "";
  if (!money) return v.toLocaleString("en-NG");
  return new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(v);
}
