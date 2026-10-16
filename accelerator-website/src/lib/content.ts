import "server-only";
import { db, dbConfigured } from "./db";
import { DEFAULT_TICKETS, type TicketType, type TicketId } from "./tickets";

export type EventSettings = {
  name: string;
  theme: string | null;
  themeTagline: string | null; // line shown under the theme
  startsAt: string | null; // ISO instant (midnight Lagos time when only the date is confirmed)
  timeConfirmed: boolean; // false = only the date is confirmed, hide the start time
  endsAt: string | null;
  venueName: string | null;
  address: string | null;
  city: string | null;
  summary: string | null;
};

export const DEFAULT_EVENT: EventSettings = {
  name: "Accelerators Events 2026",
  // Confirmed by Accelerator Community.
  theme: "The Summit of Excellence",
  themeTagline: "Rise with Purpose. Lead with Power. Reign with Excellence.",
  // Confirmed by Accelerator Community: Saturday 5 December 2026, Ibadan. Start time not yet confirmed.
  startsAt: "2026-12-04T23:00:00.000Z", // 5 Dec 2026 00:00 Lagos
  timeConfirmed: false,
  endsAt: null,
  venueName: null,
  address: null,
  city: "Ibadan",
  summary: null,
};

export type Speaker = { id: string; name: string; title: string | null; bio: string | null; topic: string | null; photo_url: string | null; sort_order: number; published: boolean };
export type Award = { id: string; title: string; description: string | null; nominees: string | null; winners: string | null; sort_order: number; published: boolean };
export type ContestStatus = "coming_soon" | "open" | "closed" | "winners_announced";
export type Contest = {
  id: string; title: string; description: string | null; requirements: string | null; starts_at: string | null; deadline: string | null;
  status: ContestStatus; prize: string | null; submission_url: string | null; rules: string | null; winners: string | null; sort_order: number; published: boolean;
};

type TicketRow = {
  id: TicketId; name: string; description: string; price_kobo: number | null; currency: "NGN"; sales_start: string | null; sales_end: string | null;
  benefits: string[] | null; enabled: boolean; sort_order: number;
};

export function rowToTicket(r: TicketRow): TicketType {
  return {
    id: r.id, name: r.name, description: r.description, priceKobo: r.price_kobo, currency: r.currency ?? "NGN",
    salesStart: r.sales_start, salesEnd: r.sales_end, benefits: r.benefits ?? [], enabled: r.enabled, sortOrder: r.sort_order,
  };
}

export async function getTickets(): Promise<TicketType[]> {
  if (!dbConfigured()) return DEFAULT_TICKETS;
  try {
    const { data, error } = await db().from("ticket_types").select("*").order("sort_order");
    if (error || !data?.length) return DEFAULT_TICKETS;
    return (data as TicketRow[]).map(rowToTicket);
  } catch {
    return DEFAULT_TICKETS;
  }
}

export async function getTicket(id: string): Promise<TicketType | null> {
  const all = await getTickets();
  return all.find((t) => t.id === id) ?? null;
}

export async function getEventSettings(): Promise<EventSettings> {
  if (!dbConfigured()) return DEFAULT_EVENT;
  try {
    const { data } = await db().from("settings").select("value").eq("key", "event").maybeSingle();
    return { ...DEFAULT_EVENT, ...((data?.value as Partial<EventSettings>) ?? {}) };
  } catch {
    return DEFAULT_EVENT;
  }
}

/**
 * Contests supplied on official flyers. Used until the database holds published contests.
 * Status follows the dates automatically (see contestStatus), unless winners are announced.
 */
export const DEFAULT_CONTESTS: Contest[] = [
  {
    id: "inter-office-100k-content-challenge",
    title: "Accelerator Inter-Office \u20A6100K Content Challenge",
    description: "Unleash your creativity. Edit with impact. Win big. Inspire more. Create and edit standout video content and compete for a share of \u20A6100,000.",
    requirements: null,
    starts_at: "2026-10-11T23:00:00.000Z", // 12 Oct 2026, 00:00 Lagos
    deadline: "2026-10-31T22:59:59.999Z", // 31 Oct 2026, 23:59 Lagos
    status: "open",
    prize: "1st place \u20A650,000 \u00B7 2nd place \u20A630,000 \u00B7 3rd place \u20A620,000",
    submission_url: null,
    rules: null,
    winners: null,
    sort_order: 0,
    published: true,
  },
];

/** Derive a contest's live status from its dates (winners_announced is always manual). */
export function contestStatus(c: Contest, now = new Date()): ContestStatus {
  if (c.status === "winners_announced") return c.status;
  const t = now.getTime();
  if (c.starts_at && t < Date.parse(c.starts_at)) return "coming_soon";
  if (c.deadline && t > Date.parse(c.deadline)) return "closed";
  if (c.starts_at || c.deadline) return "open";
  return c.status;
}

async function list<T>(table: string, publishedOnly = true): Promise<T[]> {
  if (!dbConfigured()) return [];
  try {
    let q = db().from(table).select("*").order("sort_order").order("created_at");
    if (publishedOnly) q = q.eq("published", true);
    const { data } = await q;
    return (data as T[]) ?? [];
  } catch {
    return [];
  }
}

export const getSpeakers = (all = false) => list<Speaker>("speakers", !all);
export const getAwards = (all = false) => list<Award>("awards", !all);
export async function getContests(all = false): Promise<Contest[]> {
  const rows = await list<Contest>("contests", !all);
  const merged = rows.length ? rows : DEFAULT_CONTESTS;
  return merged.map((c) => ({ ...c, status: contestStatus(c) }));
}
export const getContestRows = () => list<Contest>("contests", false);
export const getContest = async (id: string) => (await getContests()).find((c) => c.id === id) ?? null;

export const CONTEST_STATUS_LABEL: Record<ContestStatus, string> = {
  coming_soon: "Coming soon",
  open: "Open",
  closed: "Closed",
  winners_announced: "Winners announced",
};
