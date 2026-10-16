import "server-only";
import { db, dbConfigured } from "./db";
import { DEFAULT_TICKETS, type TicketType, type TicketId } from "./tickets";

export type EventSettings = {
  name: string;
  theme: string | null;
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
  theme: null,
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
export const getContests = (all = false) => list<Contest>("contests", !all);

export const CONTEST_STATUS_LABEL: Record<ContestStatus, string> = {
  coming_soon: "Coming soon",
  open: "Open",
  closed: "Closed",
  winners_announced: "Winners announced",
};
