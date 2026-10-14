import { DateTime, Interval } from "luxon";
import type { Occurrence, Preferences, Profile } from "../types";
import { bufferedInterval, windowIntervals } from "./conflicts";
import { zonedDateTime } from "../time";

export type PartOfDay = "morning" | "afternoon" | "evening" | "any";

export interface FreeSlot {
  start: string;
  end: string;
  date: string;
  score: number;
  reasons: string[];
}

export interface FindSlotsInput {
  occurrences: Occurrence[];
  fromDate: string;
  toDate: string;
  tz: string;
  durationMinutes: number;
  profile: Pick<Profile, "wake_time" | "bedtime">;
  preferences: Pick<Preferences, "focus_hours" | "protected_rest" | "min_buffer_minutes" | "wind_down_minutes" | "max_daily_hours">;
  partOfDay?: PartOfDay;
  /** never suggest anything starting before this instant (defaults to now) */
  notBefore?: DateTime;
  respectProtectedRest?: boolean;
  preferFocusHours?: boolean;
  /** occurrence keys to treat as free (e.g. the item being moved) */
  ignoreKeys?: Set<string>;
  /** earliest/latest local clock time to consider, e.g. "17:00" */
  windowStart?: string;
  windowEnd?: string;
  maxResults?: number;
  stepMinutes?: number;
}

const PART_BOUNDS: Record<Exclude<PartOfDay, "any">, [string, string]> = {
  morning: ["05:00", "12:00"],
  afternoon: ["12:00", "17:00"],
  evening: ["17:00", "23:59"],
};

/**
 * Deterministic free-slot finder. Respects sleep, wind-down, buffers, protected
 * rest and existing commitments. Returns at most one suggestion per free gap so
 * that suggestions are spread out instead of filling every minute.
 */
export function findFreeSlots(input: FindSlotsInput): FreeSlot[] {
  const step = input.stepMinutes ?? 15;
  const buffer = input.preferences.min_buffer_minutes ?? 15;
  const notBefore = input.notBefore ?? DateTime.now();
  const ignore = input.ignoreKeys ?? new Set<string>();
  const out: FreeSlot[] = [];
  let d = DateTime.fromISO(input.fromDate, { zone: input.tz });
  const last = DateTime.fromISO(input.toDate, { zone: input.tz });

  while (d <= last) {
    const date = d.toISODate()!;
    let dayStart = zonedDateTime(date, input.profile.wake_time, input.tz);
    let dayEnd = zonedDateTime(date, input.profile.bedtime, input.tz).minus({ minutes: input.preferences.wind_down_minutes ?? 30 });
    if (dayEnd <= dayStart) dayEnd = dayEnd.plus({ days: 1 });
    const part = input.partOfDay && input.partOfDay !== "any" ? PART_BOUNDS[input.partOfDay] : null;
    const ws = input.windowStart ?? part?.[0];
    const we = input.windowEnd ?? part?.[1];
    if (ws) dayStart = DateTime.max(dayStart, zonedDateTime(date, ws, input.tz));
    if (we) dayEnd = DateTime.min(dayEnd, zonedDateTime(date, we, input.tz));
    if (dayEnd <= dayStart) {
      d = d.plus({ days: 1 });
      continue;
    }
    const day = Interval.fromDateTimes(dayStart, dayEnd);

    const busy: Interval[] = [];
    let busyMinutes = 0;
    for (const o of input.occurrences) {
      if (o.allDay || o.status === "cancelled" || ignore.has(o.key)) continue;
      const b = bufferedInterval(o);
      const padded = Interval.fromDateTimes(b.start!.minus({ minutes: buffer }), b.end!.plus({ minutes: buffer }));
      const hit = padded.intersection(day);
      if (hit && hit.isValid) {
        busy.push(padded);
        busyMinutes += bufferedInterval(o).intersection(day)?.length("minutes") ?? 0;
      }
    }
    if (input.respectProtectedRest !== false) {
      busy.push(...windowIntervals(input.preferences.protected_rest, dayStart, dayEnd, input.tz));
    }
    const focus = windowIntervals(input.preferences.focus_hours, dayStart, dayEnd, input.tz);
    const free = day.difference(...Interval.merge(busy));

    for (const gap of free) {
      let s = gap.start!.setZone(input.tz);
      if (s < notBefore) s = notBefore.setZone(input.tz);
      // align to step
      const rem = s.minute % step;
      if (rem || s.second || s.millisecond) s = s.plus({ minutes: step - rem }).set({ second: 0, millisecond: 0 });
      const e = s.plus({ minutes: input.durationMinutes });
      if (e > gap.end!) continue;

      const reasons: string[] = [];
      let score = 100;
      const slot = Interval.fromDateTimes(s, e);
      if (input.preferFocusHours !== false && focus.some((f) => f.engulfs(slot))) {
        score += 15;
        reasons.push("inside your focus hours");
      }
      const loadAfter = busyMinutes + input.durationMinutes;
      if (loadAfter > input.preferences.max_daily_hours * 60) {
        score -= 40;
        reasons.push("this day is already full");
      } else if (busyMinutes < 4 * 60) {
        score += 10;
        reasons.push("a lighter day");
      }
      const daysOut = Math.max(0, Math.floor(s.diff(notBefore, "days").days));
      score -= daysOut * 2;
      if (gap.length("minutes") >= input.durationMinutes + 60) reasons.push("leaves breathing room around it");
      out.push({ start: s.toISO()!, end: e.toISO()!, date, score, reasons });
    }
    d = d.plus({ days: 1 });
  }
  out.sort((a, b) => b.score - a.score || (a.start < b.start ? -1 : 1));
  return out.slice(0, input.maxResults ?? 8);
}
