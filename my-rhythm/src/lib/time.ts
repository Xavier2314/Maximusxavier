import { DateTime } from "luxon";

export const DEFAULT_TZ = "Africa/Lagos";

/** Parse "HH:mm" or "HH:mm:ss" into minutes after midnight. */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(min: number): string {
  const m = ((min % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

/** Local wall-clock date+time in a zone → DateTime (DST-safe: luxon resolves gaps forward). */
export function zonedDateTime(date: string, time: string, tz: string): DateTime {
  const [h, m] = time.split(":").map(Number);
  return DateTime.fromISO(date, { zone: tz }).set({ hour: h, minute: m || 0, second: 0, millisecond: 0 });
}

export function nowIn(tz: string): DateTime {
  return DateTime.now().setZone(tz);
}

export function todayIn(tz: string): string {
  return nowIn(tz).toISODate()!;
}

/** 12-hour formatting used across the interface, e.g. "5:00 AM". */
export function fmtTime(iso: string | DateTime, tz: string): string {
  const dt = typeof iso === "string" ? DateTime.fromISO(iso, { setZone: true }).setZone(tz) : iso.setZone(tz);
  return dt.toFormat("h:mm a");
}

export function fmtTimeShort(iso: string | DateTime, tz: string): string {
  const dt = typeof iso === "string" ? DateTime.fromISO(iso, { setZone: true }).setZone(tz) : iso.setZone(tz);
  return dt.minute === 0 ? dt.toFormat("h a") : dt.toFormat("h:mm a");
}

export function fmtHHmm12(hhmm: string): string {
  const min = timeToMinutes(hhmm);
  const h = Math.floor(min / 60);
  const m = min % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function fmtDate(iso: string, tz: string, fmt = "cccc, d LLLL yyyy"): string {
  return DateTime.fromISO(iso, { zone: tz }).toFormat(fmt);
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export function isValidZone(tz: string): boolean {
  return DateTime.now().setZone(tz).isValid;
}

/** Monday-based week start (ISO) for a date in a zone. */
export function weekStart(date: string, tz: string): string {
  return DateTime.fromISO(date, { zone: tz }).startOf("week").toISODate()!;
}

export function addDays(date: string, n: number): string {
  return DateTime.fromISO(date).plus({ days: n }).toISODate()!;
}

export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  let d = DateTime.fromISO(from);
  const end = DateTime.fromISO(to);
  while (d <= end) {
    out.push(d.toISODate()!);
    d = d.plus({ days: 1 });
  }
  return out;
}
