type ClassValue = string | number | null | undefined | false | ClassValue[] | Record<string, boolean | null | undefined>;

/** Join class names, skipping falsy values. */
export function cn(...values: ClassValue[]): string {
  const out: string[] = [];
  const walk = (v: ClassValue) => {
    if (!v) return;
    if (typeof v === "string" || typeof v === "number") out.push(String(v));
    else if (Array.isArray(v)) v.forEach(walk);
    else for (const [k, on] of Object.entries(v)) if (on) out.push(k);
  };
  values.forEach(walk);
  return out.join(" ");
}

const LOCALE = "en-NG";
export const DEFAULT_TZ = "Africa/Lagos";

export function formatMoney(value: number | string | null | undefined, currency = "NGN"): string {
  const n = Number(value ?? 0);
  return new Intl.NumberFormat(LOCALE, { style: "currency", currency, maximumFractionDigits: n % 1 === 0 ? 0 : 2 }).format(n);
}

export function formatCompact(value: number | string | null | undefined): string {
  return new Intl.NumberFormat(LOCALE, { notation: "compact", maximumFractionDigits: 1 }).format(Number(value ?? 0));
}

export function formatNumber(value: number | string | null | undefined): string {
  return new Intl.NumberFormat(LOCALE).format(Number(value ?? 0));
}

export function formatDate(value: string | Date | null | undefined, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" }, timeZone = DEFAULT_TZ): string {
  if (!value) return "—";
  const d = typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T12:00:00Z`) : new Date(value);
  return new Intl.DateTimeFormat(LOCALE, { ...opts, timeZone }).format(d);
}

export function formatTime(value: string | Date | null | undefined, timeZone = DEFAULT_TZ): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(value));
}

export function formatRelative(value: string | Date): string {
  const diff = (new Date(value).getTime() - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60],
  ];
  for (const [unit, secs] of units) if (Math.abs(diff) >= secs) return rtf.format(Math.round(diff / secs), unit);
  return "just now";
}

/** Today's date (YYYY-MM-DD) in a time zone. */
export function todayIn(timeZone = DEFAULT_TZ): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function monthStart(date = todayIn()): string {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(isoMonth: string, n: number): string {
  const [y, m] = isoMonth.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + n, 1));
  return d.toISOString().slice(0, 10);
}

/** The five-day evaluation schedule: 1, 5, 10, 15, 20, 25, 30 (month end in shorter months). */
export function evaluationDates(isoDate: string): string[] {
  const [y, m] = isoDate.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const days = Array.from(new Set([1, 5, 10, 15, 20, 25, 30].map((d) => Math.min(d, last))));
  return days.map((d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
}

export function currentEvaluationPeriod(isoDate = todayIn()): string {
  return evaluationDates(isoDate).filter((d) => d <= isoDate).at(-1)!;
}

export function nextEvaluationDate(isoDate = todayIn()): string {
  return evaluationDates(isoDate).find((d) => d > isoDate) ?? addMonths(monthStart(isoDate), 1);
}

export function initials(name: string | null | undefined): string {
  return (name ?? "?").split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
}

export function percent(value: number, target: number | null | undefined): number {
  if (!target || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

/** Turn a Postgres/Supabase error into a message safe and helpful for members. */
export function friendlyError(error: { message?: string; code?: string } | null | undefined, fallback = "Something went wrong. Please try again."): string {
  if (!error?.message) return fallback;
  if (error.code === "42501" || /row-level security|permission denied/i.test(error.message)) {
    return "You don't have permission to do that.";
  }
  if (error.code === "23505") return "That record already exists.";
  // Messages raised by our own database functions are written for members.
  if (error.code === "P0001" || !error.code) return error.message;
  return fallback;
}
