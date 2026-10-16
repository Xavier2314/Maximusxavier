/**
 * Ticket sales windows.
 *
 * All instants are stored as absolute UTC timestamps. Africa/Lagos is UTC+01:00 all year
 * (no daylight saving), so "31 Oct 2026 23:59:59 Lagos" === "2026-10-31T22:59:59Z".
 * Status is always computed from the server clock at request time, so the switch from
 * Early Bird to Late Registration happens automatically with no redeploy.
 */

export const EVENT_TZ = "Africa/Lagos";

export type TicketId = "early_bird" | "late";

export type TicketType = {
  id: TicketId;
  name: string;
  description: string;
  priceKobo: number | null; // null = price not yet confirmed
  currency: "NGN";
  salesStart: string | null; // ISO instant; null = open immediately
  salesEnd: string | null; // ISO instant; null = until further notice
  benefits: string[]; // empty until confirmed
  enabled: boolean;
  sortOrder: number;
};

export type TicketStatus = "upcoming" | "on_sale" | "ended" | "disabled";

export const DEFAULT_TICKETS: TicketType[] = [
  {
    id: "early_bird",
    name: "Early Bird",
    description: "Register early for Accelerators Events 2026.",
    priceKobo: null,
    currency: "NGN",
    salesStart: null,
    salesEnd: "2026-10-31T22:59:59.999Z", // 31 Oct 2026, 11:59 PM Lagos
    benefits: [],
    enabled: true,
    sortOrder: 1,
  },
  {
    id: "late",
    name: "Late Registration",
    description: "Standard registration after the Early Bird window closes.",
    priceKobo: null,
    currency: "NGN",
    salesStart: "2026-10-31T23:00:00.000Z", // 1 Nov 2026, 12:00 AM Lagos
    salesEnd: null,
    benefits: [],
    enabled: true,
    sortOrder: 2,
  },
];

export function ticketStatus(t: TicketType, now: Date = new Date()): TicketStatus {
  if (!t.enabled) return "disabled";
  const ms = now.getTime();
  if (t.salesStart && ms < Date.parse(t.salesStart)) return "upcoming";
  if (t.salesEnd && ms > Date.parse(t.salesEnd)) return "ended";
  return "on_sale";
}

/** A ticket can be bought only when on sale AND it has a confirmed price. */
export function canPurchase(t: TicketType, now: Date = new Date()) {
  return ticketStatus(t, now) === "on_sale" && typeof t.priceKobo === "number" && t.priceKobo > 0;
}

export function formatNaira(kobo: number | null) {
  if (kobo == null) return null;
  return new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);
}

export function formatLagos(iso: string | null, opts: Intl.DateTimeFormatOptions = {}) {
  if (!iso) return null;
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: EVENT_TZ,
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    ...opts,
  }).format(new Date(iso));
}

export function formatLagosDate(iso: string | null) {
  return formatLagos(iso, { hour: undefined, minute: undefined, hour12: undefined });
}

/** Convert a `datetime-local` value entered as Lagos time into a UTC ISO instant. */
export function lagosLocalToIso(local: string): string | null {
  if (!local) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) return null;
  const [, y, mo, d, h, mi] = m.map(Number);
  return new Date(Date.UTC(y, mo - 1, d, h - 1, mi)).toISOString();
}

/** Convert a UTC ISO instant into a `datetime-local` string in Lagos time. */
export function isoToLagosLocal(iso: string | null): string {
  if (!iso) return "";
  const t = new Date(Date.parse(iso) + 60 * 60 * 1000);
  return t.toISOString().slice(0, 16);
}
