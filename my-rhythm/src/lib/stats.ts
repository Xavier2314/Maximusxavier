import { DateTime } from "luxon";

/** Statistics are computed ONLY from real completion records — nothing is inferred as "done". */

export interface OccLike {
  start: string;
  end: string;
  state: string;
  categoryKey: string | null;
  title: string;
  groupKey?: string | null;
  completionMinutes?: number | null;
}

export interface CategoryStat {
  key: string;
  scheduled: number;
  completed: number;
  skipped: number;
  missed: number;
  upcoming: number;
  minutesCompleted: number;
  rate: number | null; // completed / (completed + skipped + missed)
}

export function categoryStats(occ: OccLike[]): Record<string, CategoryStat> {
  const out: Record<string, CategoryStat> = {};
  for (const o of occ) {
    if (o.state === "cancelled") continue;
    // gym routine satellites (travel/prep/return) aren't separate achievements
    if (o.groupKey === "gym-morning" && !/workout/i.test(o.title)) continue;
    const k = o.categoryKey ?? "personal";
    const s = (out[k] ??= { key: k, scheduled: 0, completed: 0, skipped: 0, missed: 0, upcoming: 0, minutesCompleted: 0, rate: null });
    s.scheduled++;
    if (o.state === "completed") {
      s.completed++;
      s.minutesCompleted += o.completionMinutes ?? Math.round(DateTime.fromISO(o.end).diff(DateTime.fromISO(o.start), "minutes").minutes);
    } else if (o.state === "skipped") s.skipped++;
    else if (o.state === "missed") s.missed++;
    else s.upcoming++;
  }
  for (const s of Object.values(out)) {
    const due = s.completed + s.skipped + s.missed;
    s.rate = due ? Math.round((s.completed / due) * 100) : null;
  }
  return out;
}

/** Daily progress: completed ÷ (everything scheduled today that isn't cancelled). */
export function dailyProgress(occ: OccLike[]): { done: number; total: number; percent: number } {
  const relevant = occ.filter((o) => o.state !== "cancelled" && !(o.groupKey === "gym-morning" && !/workout/i.test(o.title)));
  const done = relevant.filter((o) => o.state === "completed").length;
  return { done, total: relevant.length, percent: relevant.length ? Math.round((done / relevant.length) * 100) : 0 };
}

export interface StreakResult {
  current: number;
  longest: number;
  last7: number;
  last30: number;
  thisWeek: number;
  thisMonth: number;
}

/** Streaks from a set of completion dates (YYYY-MM-DD). A streak stays alive until a full day is missed. */
export function streaks(dates: string[], today: string): StreakResult {
  const set = new Set(dates);
  const t = DateTime.fromISO(today);
  let current = 0;
  let d = set.has(today) ? t : t.minus({ days: 1 });
  while (set.has(d.toISODate()!)) {
    current++;
    d = d.minus({ days: 1 });
  }
  const sorted = [...set].sort();
  let longest = 0;
  let run = 0;
  let prev: DateTime | null = null;
  for (const s of sorted) {
    const cur = DateTime.fromISO(s);
    run = prev && Math.round(cur.diff(prev, "days").days) === 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = cur;
  }
  const within = (n: number) => sorted.filter((s) => s > t.minus({ days: n }).toISODate()! && s <= today).length;
  const weekStart = t.startOf("week").toISODate()!;
  const monthStart = t.startOf("month").toISODate()!;
  return {
    current,
    longest,
    last7: within(7),
    last30: within(30),
    thisWeek: sorted.filter((s) => s >= weekStart && s <= today).length,
    thisMonth: sorted.filter((s) => s >= monthStart && s <= today).length,
  };
}

export function gentleSummary(stats: Record<string, CategoryStat>, names: Record<string, string>): string[] {
  const lines: string[] = [];
  const entries = Object.values(stats).filter((s) => s.completed + s.skipped + s.missed > 0);
  if (!entries.length) return ["No completed or missed activities were recorded this week yet. Mark activities as complete to see your progress here."];
  const best = [...entries].sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0))[0];
  if (best && (best.rate ?? 0) > 0) lines.push(`Your most consistent area was ${names[best.key] ?? best.key} (${best.rate}% of sessions completed).`);
  for (const s of entries) {
    if ((s.rate ?? 100) < 60) {
      lines.push(`${names[s.key] ?? s.key} had ${s.missed + s.skipped} session${s.missed + s.skipped === 1 ? "" : "s"} not completed — consider a time that fits your energy better, or a lighter goal for next week.`);
    }
  }
  return lines;
}
