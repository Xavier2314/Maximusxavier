import { DateTime } from "luxon";
import type { ActivityRow, ExceptionRow, Occurrence, Recurrence } from "../types";
import { zonedDateTime } from "../time";

/**
 * Deterministic recurrence expansion.
 *
 * Recurring activities are expanded on *local calendar dates* in the
 * activity's timezone (or the user's profile timezone when floating), then
 * converted to instants. This keeps "5:00 AM every day" at 5:00 AM wall-clock
 * time across daylight-saving changes when travelling.
 */

function daysBetween(a: DateTime, b: DateTime): number {
  return Math.round(b.startOf("day").diff(a.startOf("day"), "days").days);
}

export function recurrenceMatches(rec: Recurrence, seriesStart: DateTime, d: DateTime): boolean {
  const interval = Math.max(1, rec.interval ?? 1);
  if (d < seriesStart.startOf("day")) return false;
  if (rec.until && d.toISODate()! > rec.until) return false;
  switch (rec.freq) {
    case "daily":
      return daysBetween(seriesStart, d) % interval === 0;
    case "weekly": {
      const days = rec.by_weekday?.length ? rec.by_weekday : [seriesStart.weekday];
      if (!days.includes(d.weekday)) return false;
      const weeks = Math.round(d.startOf("week").diff(seriesStart.startOf("week"), "weeks").weeks);
      return weeks % interval === 0;
    }
    case "monthly": {
      if (d.day !== seriesStart.day) return false;
      const months = (d.year - seriesStart.year) * 12 + (d.month - seriesStart.month);
      return months % interval === 0;
    }
    case "yearly":
      return d.month === seriesStart.month && d.day === seriesStart.day && (d.year - seriesStart.year) % interval === 0;
  }
}

/** All occurrence dates (local, YYYY-MM-DD) of an activity whose *series date* falls in [fromDate, toDate]. */
export function occurrenceDates(activity: ActivityRow, fromDate: string, toDate: string, tz: string): string[] {
  const start = DateTime.fromISO(activity.start_date, { zone: tz });
  if (!activity.recurrence) {
    return activity.start_date >= fromDate && activity.start_date <= toDate ? [activity.start_date] : [];
  }
  const rec = activity.recurrence;
  const out: string[] = [];
  const to = DateTime.fromISO(toDate, { zone: tz });
  // With COUNT we must enumerate from the series start to count correctly.
  let d = rec.count ? start : DateTime.max(start, DateTime.fromISO(fromDate, { zone: tz }));
  let produced = 0;
  let guard = 0;
  while (d <= to && guard++ < 4000) {
    if (recurrenceMatches(rec, start, d)) {
      produced++;
      if (rec.count && produced > rec.count) break;
      const iso = d.toISODate()!;
      if (iso >= fromDate) out.push(iso);
    }
    d = d.plus({ days: 1 });
  }
  return out;
}

function baseTimes(activity: ActivityRow, date: string, tz: string): { start: DateTime; end: DateTime } {
  if (activity.all_day) {
    const start = DateTime.fromISO(date, { zone: tz }).startOf("day");
    const spanDays = activity.end_date
      ? daysBetween(DateTime.fromISO(activity.start_date), DateTime.fromISO(activity.end_date)) + 1
      : 1;
    return { start, end: start.plus({ days: spanDays }) };
  }
  const start = zonedDateTime(date, activity.start_time ?? "00:00", tz);
  return { start, end: start.plus({ minutes: activity.duration_minutes }) };
}

export function activityZone(activity: ActivityRow, profileTz: string): string {
  return activity.timezone || profileTz;
}

/** Longest span (in days) an occurrence of this activity can cover — used to look back for overlaps. */
function spanDays(activity: ActivityRow): number {
  if (activity.all_day && activity.end_date) {
    return daysBetween(DateTime.fromISO(activity.start_date), DateTime.fromISO(activity.end_date)) + 1;
  }
  return Math.ceil(activity.duration_minutes / 1440) + 1;
}

export interface ExpandOptions {
  includeCancelled?: boolean;
}

/**
 * Expand activities into concrete occurrences overlapping [rangeStart, rangeEnd).
 */
export function expandOccurrences(
  activities: ActivityRow[],
  exceptions: ExceptionRow[],
  rangeStart: DateTime,
  rangeEnd: DateTime,
  profileTz: string,
  opts: ExpandOptions = {},
): Occurrence[] {
  const excByKey = new Map<string, ExceptionRow>();
  for (const e of exceptions) excByKey.set(`${e.activity_id}:${e.occurrence_date}`, e);
  const out: Occurrence[] = [];
  const seen = new Set<string>();

  for (const a of activities) {
    if (a.status !== "active") continue;
    const tz = activityZone(a, profileTz);
    const from = rangeStart.setZone(tz).minus({ days: spanDays(a) }).toISODate()!;
    const to = rangeEnd.setZone(tz).toISODate()!;
    const dates = occurrenceDates(a, from, to, tz);

    // Occurrences moved INTO the range from a series date outside it.
    for (const e of exceptions) {
      if (e.activity_id !== a.id || e.kind !== "modified" || !e.start_at || !e.end_at) continue;
      if (dates.includes(e.occurrence_date)) continue;
      const s = DateTime.fromISO(e.start_at);
      const en = DateTime.fromISO(e.end_at);
      if (s < rangeEnd && en > rangeStart) {
        // Only honour it if the original date is a real occurrence of the series.
        if (occurrenceDates(a, e.occurrence_date, e.occurrence_date, tz).length) dates.push(e.occurrence_date);
      }
    }

    for (const date of dates) {
      const key = `${a.id}:${date}`;
      if (seen.has(key)) continue;
      const exc = excByKey.get(key);
      let { start, end } = baseTimes(a, date, tz);
      let status: Occurrence["status"] = "scheduled";
      let modified = false;
      let title = a.title;
      if (exc) {
        if (exc.kind === "cancelled") status = "cancelled";
        if (exc.kind === "needs_reschedule") status = "needs_reschedule";
        if (exc.start_at && exc.end_at) {
          start = DateTime.fromISO(exc.start_at).setZone(tz);
          end = DateTime.fromISO(exc.end_at).setZone(tz);
          modified = true;
        }
        if (exc.title) {
          title = exc.title;
          modified = true;
        }
      }
      if (status === "cancelled" && !opts.includeCancelled) continue;
      // Zero-length (point-in-time) occurrences count when their instant is inside the range.
      const overlaps = end > start ? start < rangeEnd && end > rangeStart : start >= rangeStart && start < rangeEnd;
      if (!overlaps) continue;
      seen.add(key);
      out.push({
        key,
        activityId: a.id,
        occurrenceDate: date,
        title,
        start: start.toISO()!,
        end: end.toISO()!,
        allDay: a.all_day,
        timezone: tz,
        categoryId: a.category_id,
        classification: a.classification,
        priority: a.priority,
        kind: a.kind,
        location: a.location,
        groupKey: a.group_key,
        recurring: !!a.recurrence,
        status,
        modified,
        prepMinutes: a.prep_minutes,
        travelMinutes: a.travel_minutes,
        recoveryMinutes: a.recovery_minutes,
        exceptionNote: exc?.note ?? null,
      });
    }
  }
  out.sort((x, y) => (x.start < y.start ? -1 : x.start > y.start ? 1 : x.title.localeCompare(y.title)));
  return out;
}

/** Convenience: expand for whole local days [fromDate, toDate] in the profile timezone. */
export function expandDays(
  activities: ActivityRow[],
  exceptions: ExceptionRow[],
  fromDate: string,
  toDate: string,
  tz: string,
  opts?: ExpandOptions,
): Occurrence[] {
  const s = DateTime.fromISO(fromDate, { zone: tz }).startOf("day");
  const e = DateTime.fromISO(toDate, { zone: tz }).plus({ days: 1 }).startOf("day");
  return expandOccurrences(activities, exceptions, s, e, tz, opts);
}

export function describeRecurrence(rec: Recurrence | null): string {
  if (!rec) return "Does not repeat";
  const names = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const n = rec.interval && rec.interval > 1 ? rec.interval : 1;
  let s: string;
  switch (rec.freq) {
    case "daily":
      s = n === 1 ? "Every day" : `Every ${n} days`;
      break;
    case "weekly": {
      const days = (rec.by_weekday ?? []).slice().sort();
      const label =
        days.length === 7 ? "every day" : days.join() === "1,2,3,4,5" ? "weekdays" : days.map((d) => names[d]).join(", ");
      s = n === 1 ? `Weekly on ${label}` : `Every ${n} weeks on ${label}`;
      break;
    }
    case "monthly":
      s = n === 1 ? "Monthly" : `Every ${n} months`;
      break;
    case "yearly":
      s = "Yearly";
      break;
  }
  if (rec.until) s += ` until ${rec.until}`;
  if (rec.count) s += `, ${rec.count} times`;
  return s;
}
