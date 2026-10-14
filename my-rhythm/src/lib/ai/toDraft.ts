import { DateTime } from "luxon";
import type { ParsedRequest } from "./schema";
import { ActivityDraftSchema, type ActivityDraft } from "../schedule/draft";

export interface DraftResolution {
  status: "ready" | "needs_info" | "find_time" | "question";
  drafts: ActivityDraft[];
  trip?: { destination: string; departAt: string; returnAt: string; travelMethod: string | null } | null;
  missing: string[];
  clarification: string | null;
  assumptions: string[];
}

const HHMM = /^\d{2}:\d{2}$/;

/**
 * Turn a parsed request into validated activity drafts. Refuses to guess any
 * essential detail (date, start time, destination, return) — instead returns
 * needs_info with a clarifying question.
 */
export function resolveParsed(p: ParsedRequest, tz: string, source: "ai" | "voice" | "manual" = "ai"): DraftResolution {
  const missing = new Set(p.missing);
  const assumptions = [...p.assumptions];
  const base = { status: "needs_info" as const, drafts: [], missing: [] as string[], clarification: p.clarification, assumptions };

  if (p.intent === "question") return { ...base, status: "question" };
  if (p.intent === "find_time") return { ...base, status: p.find_time ? "find_time" : "needs_info", missing: p.find_time ? [] : ["duration"] };
  if (p.intent === "unclear") return { ...base, missing: [...missing, "what to add"], clarification: p.clarification ?? "What would you like to add, and when?" };

  if (!p.date) missing.add("date");
  if (!p.all_day && !(p.start_time && HHMM.test(p.start_time))) missing.add(p.intent === "trip" ? "departure time" : "start time");

  if (p.intent === "trip") {
    if (!p.trip?.destination) missing.add("destination");
    if (!p.trip?.return_date) missing.add("return date");
    if (missing.size) return { ...base, missing: [...missing], clarification: p.clarification ?? `Please tell me the ${[...missing].join(", ")}.` };
    const depart = DateTime.fromISO(`${p.date}T${p.start_time}`, { zone: tz });
    let retTime = p.trip!.return_time;
    if (!retTime) {
      retTime = "18:00";
      assumptions.push("No return time given — assumed 6:00 PM. Please adjust if needed.");
    }
    const ret = DateTime.fromISO(`${p.trip!.return_date}T${retTime}`, { zone: tz });
    if (!(ret > depart)) return { ...base, missing: ["return date"], clarification: "The return must be after the departure. When are you coming back?" };
    const draft = ActivityDraftSchema.parse({
      title: p.title || `Trip to ${p.trip!.destination}`,
      category_key: "travel",
      kind: "trip",
      start_date: depart.toISODate(),
      start_time: depart.toFormat("HH:mm"),
      duration_minutes: Math.round(ret.diff(depart, "minutes").minutes),
      location: p.trip!.destination,
      classification: "fixed",
      priority: 2,
      notes: p.notes,
      source,
      reminders: [
        { anchor: "start", offset_minutes: -1440, message: `Your trip to ${p.trip!.destination} is tomorrow. Check your packing list.` },
        { anchor: "start", offset_minutes: -120, message: `Departure for ${p.trip!.destination} in 2 hours.` },
        { anchor: "start", offset_minutes: -60 },
        { anchor: "start", offset_minutes: 0, message: `Time to leave for ${p.trip!.destination}. Safe travels!` },
      ],
    });
    return {
      status: "ready", drafts: [draft], missing: [], clarification: null, assumptions,
      trip: { destination: p.trip!.destination, departAt: depart.toISO()!, returnAt: ret.toISO()!, travelMethod: p.trip!.travel_method },
    };
  }

  if (!p.title) missing.add("title");
  if (missing.size) return { ...base, missing: [...missing], clarification: p.clarification ?? `Please tell me the ${[...missing].join(", ")}.` };

  let duration = p.duration_minutes ?? null;
  if (!duration && p.start_time && p.end_time) {
    const s = DateTime.fromISO(`${p.date}T${p.start_time}`, { zone: tz });
    let e = DateTime.fromISO(`${p.end_date ?? p.date}T${p.end_time}`, { zone: tz });
    if (e <= s) e = e.plus({ days: 1 });
    duration = Math.round(e.diff(s, "minutes").minutes);
  }
  if (!duration && !p.all_day) {
    duration = 60;
    if (!assumptions.some((a) => /hour/i.test(a))) assumptions.push("No end time given — set to 1 hour. You can change it before saving.");
  }
  const draft = ActivityDraftSchema.parse({
    title: p.title,
    category_key: p.category_key ?? "personal",
    kind: p.kind ?? "event",
    start_date: p.date,
    start_time: p.all_day ? null : p.start_time,
    duration_minutes: p.all_day ? 0 : duration,
    all_day: p.all_day,
    end_date: p.all_day ? p.end_date : null,
    location: p.location,
    notes: p.notes,
    classification: p.classification ?? (p.kind === "meeting" || p.kind === "appointment" ? "fixed" : "flexible"),
    recurrence: p.recurrence ? { freq: p.recurrence.freq, by_weekday: p.recurrence.by_weekday.length ? p.recurrence.by_weekday : undefined } : null,
    source,
  });
  return { status: "ready", drafts: [draft], missing: [], clarification: null, assumptions };
}
