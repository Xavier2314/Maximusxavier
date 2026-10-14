import * as chrono from "chrono-node";
import { DateTime } from "luxon";
import type { ParsedRequest } from "./schema";

/**
 * Deterministic, offline parser used when no AI key is configured (or the AI
 * call fails). It resolves relative dates with the real current date in the
 * user's timezone and never invents a missing time.
 */
const CATEGORY_WORDS: [RegExp, ParsedRequest["category_key"]][] = [
  [/\b(bible|pray|prayer|church|worship|devotion|sermon|fellowship)\b/i, "spiritual"],
  [/\b(gym|workout|run|exercise|training session|fitness)\b/i, "gym"],
  [/\b(keyboard|piano|music|chord|scale|practice)\b/i, "keyboard"],
  [/\b(office|work shift)\b/i, "office"],
  [/\b(podcast|episode|record(ing)?|editing)\b/i, "podcast"],
  [/\b(travel|travelling|traveling|trip|flight|fly|journey)\b/i, "travel"],
  [/\b(event|conference|summit|wedding|party|leadership)\b/i, "events"],
];

export function fallbackParse(text: string, now: DateTime): ParsedRequest {
  const tz = now.zoneName ?? "Africa/Lagos";
  const ref = { instant: now.toJSDate(), timezone: now.offset };
  const results = chrono.parse(text, ref, { forwardDate: true });
  const base: ParsedRequest = {
    intent: "unclear", title: null, category_key: null, kind: null, date: null, start_time: null, end_time: null, end_date: null,
    duration_minutes: null, all_day: false, location: null, notes: null, recurrence: null, classification: null, trip: null,
    find_time: null, missing: [], clarification: null, assumptions: ["Parsed without AI — please review the details."],
  };
  const lower = text.toLowerCase();

  const findMatch = /\b(find|fit|where can i|schedule)\b.*\b(\d+(\.\d+)?)\s*(hours?|hrs?|h|minutes?|mins?)\b/i.exec(text);
  if (findMatch && /\b(find|fit|where)\b/i.test(text)) {
    const n = Number(findMatch[2]);
    const minutes = /^h/i.test(findMatch[4]) ? Math.round(n * 60) : Math.round(n);
    const isWeek = /this week/i.test(text);
    const before = results[0]?.start;
    const rangeEnd = before ? DateTime.fromJSDate(before.date()).setZone(tz).minus({ days: /before/i.test(text) ? 1 : 0 }) : isWeek ? now.endOf("week") : now.plus({ days: 7 });
    const cat = CATEGORY_WORDS.find(([re]) => re.test(text))?.[1] ?? "personal";
    return {
      ...base,
      intent: "find_time",
      title: titleFrom(text.replace(findMatch[0], ""), cat),
      category_key: cat,
      find_time: {
        duration_minutes: minutes,
        range_start: now.toISODate()!,
        range_end: rangeEnd.toISODate()!,
        part_of_day: /morning/i.test(text) ? "morning" : /afternoon/i.test(text) ? "afternoon" : /evening|night/i.test(text) ? "evening" : "any",
      },
    };
  }

  if (!results.length) {
    return { ...base, intent: /\?$/.test(text.trim()) ? "question" : "unclear", missing: ["date", "time"], clarification: "When is it? Please include a day and time." };
  }

  const first = results[0];
  const s = DateTime.fromJSDate(first.start.date()).setZone(tz);
  const hasTime = first.start.isCertain("hour");
  const cat = CATEGORY_WORDS.find(([re]) => re.test(text))?.[1] ?? "personal";
  const isTrip = cat === "travel" || /\b(travel|travelling|traveling|trip to|flying to)\b/i.test(lower);
  let cleaned = text;
  for (const r of results) cleaned = cleaned.replace(r.text, " ");

  if (isTrip) {
    const dest = /\b(?:to|for)\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/.exec(text)?.[1] ?? null;
    const ret = results[1]?.start ?? first.end ?? null;
    const retDt = ret ? DateTime.fromJSDate(ret.date()).setZone(tz) : null;
    const missing: string[] = [];
    if (!dest) missing.push("destination");
    if (!hasTime) missing.push("departure time");
    if (!retDt) missing.push("return date");
    return {
      ...base,
      intent: "trip",
      title: dest ? `Trip to ${dest}` : "Trip",
      category_key: "travel",
      kind: "trip",
      date: s.toISODate(),
      start_time: hasTime ? s.toFormat("HH:mm") : null,
      classification: "fixed",
      trip: dest
        ? {
            destination: dest,
            return_date: retDt?.toISODate() ?? null,
            return_time: ret && ret.isCertain("hour") ? retDt!.toFormat("HH:mm") : /evening/i.test(text) ? "18:00" : null,
            travel_method: /\b(fly|flight|plane)\b/i.test(text) ? "Flight" : /\b(car|drive|road|bus)\b/i.test(text) ? "Road" : null,
          }
        : null,
      missing,
      clarification: missing.length ? `Please confirm the ${missing.join(", ")}.` : null,
      assumptions: [...base.assumptions, ...(/evening/i.test(text) && !(ret && ret.isCertain("hour")) ? ["Assumed “evening” return means 6:00 PM."] : [])],
    };
  }

  const e = first.end ? DateTime.fromJSDate(first.end.date()).setZone(tz) : null;
  const allDay = !hasTime && /\ball day\b/i.test(text);
  const missing = !hasTime && !allDay ? ["start time"] : [];
  return {
    ...base,
    intent: "create",
    title: titleFrom(cleaned, cat),
    category_key: cat,
    kind: /meeting/i.test(text) ? "meeting" : /appointment/i.test(text) ? "appointment" : "event",
    date: s.toISODate(),
    start_time: hasTime ? s.toFormat("HH:mm") : null,
    end_time: e && first.end?.isCertain("hour") ? e.toFormat("HH:mm") : null,
    end_date: e && e.toISODate() !== s.toISODate() ? e.toISODate() : null,
    duration_minutes: e ? Math.round(e.diff(s, "minutes").minutes) : null,
    all_day: allDay,
    location: /\bat ([A-Z][\w' ]+)$/.exec(cleaned.trim())?.[1] ?? null,
    missing,
    clarification: missing.length ? "What time does it start?" : null,
    assumptions: [...base.assumptions, ...(!e && hasTime ? ["No end time given — defaulting to 1 hour."] : [])],
  };
}

function titleFrom(text: string, cat: ParsedRequest["category_key"]): string {
  let t = text
    .replace(/^\s*(please\s+)?(add|schedule|create|put|book|set up|i have|i've got|i am having|there is|there's)\s+(a|an|my)?\s*/i, "")
    .replace(/\b(on|at|by|for|from|to|this|next|tomorrow|today)\s*$/i, "")
    .replace(/\s+/g, " ")
    .replace(/[.?!,]+$/, "")
    .trim();
  t = t.replace(/\b(on|at|by|from)\s*$/i, "").trim();
  if (!t) t = cat === "keyboard" ? "Keyboard practice" : cat === "podcast" ? "Podcast session" : "New activity";
  return t.charAt(0).toUpperCase() + t.slice(1);
}
