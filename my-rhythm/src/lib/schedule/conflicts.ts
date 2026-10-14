import { DateTime, Interval } from "luxon";
import type { Occurrence, Preferences, Profile, TimeWindow } from "../types";
import { fmtDuration, fmtTime, timeToMinutes, zonedDateTime } from "../time";

export type ConflictType =
  | "overlap"
  | "buffer"
  | "sleep"
  | "overload"
  | "no_rest"
  | "protected_rest"
  | "duplicate";

export interface OccurrenceSummary {
  key: string;
  activityId: string;
  occurrenceDate: string;
  title: string;
  start: string;
  end: string;
  classification: Occurrence["classification"];
  categoryId: string | null;
  groupKey: string | null;
  status?: Occurrence["status"];
}

export interface Conflict {
  id: string;
  type: ConflictType;
  severity: "high" | "medium" | "low";
  message: string;
  candidateIndex: number;
  occurrence?: OccurrenceSummary;
  date?: string;
}

/** A proposed new block of time (a new activity occurrence, a trip, a move target …). */
export interface Candidate {
  title: string;
  start: string;
  end: string;
  allDay?: boolean;
  prepMinutes?: number;
  travelMinutes?: number;
  recoveryMinutes?: number;
  /** existing occurrence keys that this candidate replaces (e.g. when moving) */
  replaces?: string[];
  /** a trip / time away: personal essential practices (e.g. devotion) travel with you */
  away?: boolean;
}

export function summarize(o: Occurrence): OccurrenceSummary {
  return {
    key: o.key,
    activityId: o.activityId,
    occurrenceDate: o.occurrenceDate,
    title: o.title,
    start: o.start,
    end: o.end,
    classification: o.classification,
    categoryId: o.categoryId,
    groupKey: o.groupKey,
    status: o.status,
  };
}

const iv = (s: string, e: string) => Interval.fromDateTimes(DateTime.fromISO(s), DateTime.fromISO(e));

export function occInterval(o: { start: string; end: string }): Interval {
  return iv(o.start, o.end);
}

/** Interval including preparation/travel before and recovery after. */
export function bufferedInterval(o: {
  start: string;
  end: string;
  prepMinutes?: number;
  travelMinutes?: number;
  recoveryMinutes?: number;
}): Interval {
  const s = DateTime.fromISO(o.start).minus({ minutes: (o.prepMinutes ?? 0) + (o.travelMinutes ?? 0) });
  const e = DateTime.fromISO(o.end).plus({ minutes: o.recoveryMinutes ?? 0 });
  return Interval.fromDateTimes(s, e);
}

export function overlapMinutes(a: Interval, b: Interval): number {
  const i = a.intersection(b);
  return i ? Math.round(i.length("minutes")) : 0;
}

/** Sleep windows [bedtime of day d, wake of day d+1] for each night touching the interval. */
export function sleepWindows(from: DateTime, to: DateTime, profile: Pick<Profile, "bedtime" | "wake_time">, tz: string): Interval[] {
  const out: Interval[] = [];
  let d = from.setZone(tz).startOf("day").minus({ days: 1 });
  const end = to.setZone(tz).endOf("day");
  const bedMin = timeToMinutes(profile.bedtime);
  const wakeMin = timeToMinutes(profile.wake_time);
  while (d <= end) {
    const date = d.toISODate()!;
    const bed = zonedDateTime(date, profile.bedtime, tz);
    // If bedtime is after midnight (e.g. 00:30) it belongs to the following calendar day.
    const bedAt = bedMin < wakeMin ? bed.plus({ days: 1 }) : bed;
    const wake = zonedDateTime(d.plus({ days: 1 }).toISODate()!, profile.wake_time, tz);
    if (wake > bedAt) out.push(Interval.fromDateTimes(bedAt, wake));
    d = d.plus({ days: 1 });
  }
  return out;
}

export function windowIntervals(windows: TimeWindow[], from: DateTime, to: DateTime, tz: string): (Interval & { label?: string })[] {
  const out: (Interval & { label?: string })[] = [];
  let d = from.setZone(tz).startOf("day");
  const end = to.setZone(tz).endOf("day");
  while (d <= end) {
    const date = d.toISODate()!;
    for (const w of windows) {
      if (!w.days.includes(d.weekday)) continue;
      const i = Interval.fromDateTimes(zonedDateTime(date, w.start, tz), zonedDateTime(date, w.end, tz)) as Interval & { label?: string };
      if (i.isValid) {
        i.label = w.label;
        out.push(i);
      }
    }
    d = d.plus({ days: 1 });
  }
  return out;
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export interface DetectContext {
  existing: Occurrence[];
  profile: Pick<Profile, "bedtime" | "wake_time">;
  preferences: Pick<Preferences, "max_daily_hours" | "protected_rest" | "min_buffer_minutes">;
  tz: string;
  /** occurrence keys that will be removed/moved as part of the same change */
  ignoreKeys?: Set<string>;
}

/**
 * Deterministically compute every conflict a set of candidates would create.
 * No AI is involved here — this is pure interval arithmetic.
 */
export function detectConflicts(candidates: Candidate[], ctx: DetectContext): Conflict[] {
  const out: Conflict[] = [];
  const ignore = new Set(ctx.ignoreKeys ?? []);
  candidates.forEach((c) => c.replaces?.forEach((k) => ignore.add(k)));
  const live = ctx.existing.filter((o) => o.status !== "cancelled" && !ignore.has(o.key));
  let n = 0;
  const id = () => `c${++n}`;

  candidates.forEach((c, ci) => {
    const core = occInterval(c);
    const buffered = bufferedInterval(c);
    const isLong = core.length("hours") > 20; // trips / multi-day events

    for (const o of live) {
      if (o.allDay && !c.allDay) continue; // all-day markers don't block time
      if (c.away && o.classification === "essential") continue; // e.g. devotion continues while travelling
      const oCore = occInterval(o);
      const mins = overlapMinutes(core, oCore);
      if (norm(o.title) === norm(c.title) && Math.abs(DateTime.fromISO(o.start).diff(DateTime.fromISO(c.start), "minutes").minutes) <= 30) {
        out.push({ id: id(), type: "duplicate", severity: "high", candidateIndex: ci, occurrence: summarize(o),
          message: `“${c.title}” already exists at ${fmtTime(o.start, ctx.tz)} on ${DateTime.fromISO(o.start).setZone(ctx.tz).toFormat("ccc d LLL")}. This looks like a duplicate.` });
        continue;
      }
      if (mins > 0) {
        out.push({ id: id(), type: "overlap", severity: o.classification === "fixed" || o.classification === "essential" ? "high" : "medium",
          candidateIndex: ci, occurrence: summarize(o),
          message: `Overlaps ${o.title} (${DateTime.fromISO(o.start).setZone(ctx.tz).toFormat("ccc")} ${fmtTime(o.start, ctx.tz)}–${fmtTime(o.end, ctx.tz)})${isLong ? "" : ` by ${fmtDuration(mins)}`}.` });
        continue;
      }
      const oBuf = bufferedInterval(o);
      if (overlapMinutes(buffered, oCore) > 0 || overlapMinutes(core, oBuf) > 0) {
        out.push({ id: id(), type: "buffer", severity: "medium", candidateIndex: ci, occurrence: summarize(o),
          message: `Not enough preparation or travel time between this and ${o.title} at ${fmtTime(o.start, ctx.tz)}.` });
      }
    }

    if (!c.allDay && !isLong) {
      let lost = 0;
      for (const s of sleepWindows(core.start!, core.end!, ctx.profile, ctx.tz)) lost += overlapMinutes(core, s);
      if (lost > 0) {
        out.push({ id: id(), type: "sleep", severity: lost >= 60 ? "high" : "medium", candidateIndex: ci,
          message: `Cuts ${fmtDuration(lost)} into your sleep window (bedtime ${fmtTime(zonedDateTime("2000-01-01", ctx.profile.bedtime, ctx.tz), ctx.tz)}, wake ${fmtTime(zonedDateTime("2000-01-01", ctx.profile.wake_time, ctx.tz), ctx.tz)}).` });
      }
      for (const w of windowIntervals(ctx.preferences.protected_rest, core.start!, core.end!, ctx.tz)) {
        if (overlapMinutes(core, w) > 0) {
          out.push({ id: id(), type: "protected_rest", severity: "low", candidateIndex: ci,
            message: `Falls inside your protected time${w.label ? ` (${w.label})` : ""}.` });
          break;
        }
      }
    }
  });

  // Day-level load checks for every local day the candidates touch.
  const days = new Set<string>();
  for (const c of candidates) {
    let d = DateTime.fromISO(c.start).setZone(ctx.tz).startOf("day");
    const e = DateTime.fromISO(c.end).setZone(ctx.tz);
    while (d < e) {
      days.add(d.toISODate()!);
      d = d.plus({ days: 1 });
    }
  }
  for (const date of days) {
    const load = dayLoad(date, [...live, ...candidates.map(asPseudo)], ctx);
    const max = ctx.preferences.max_daily_hours * 60;
    if (load.busyMinutes > max) {
      out.push({ id: id(), type: "overload", severity: "medium", candidateIndex: 0, date,
        message: `${DateTime.fromISO(date).toFormat("cccc d LLL")} would have ${fmtDuration(load.busyMinutes)} of commitments — more than your ${ctx.preferences.max_daily_hours} h limit.` });
    }
    if (load.longestFreeMinutes < 60 && load.busyMinutes > 6 * 60) {
      out.push({ id: id(), type: "no_rest", severity: "low", candidateIndex: 0, date,
        message: `${DateTime.fromISO(date).toFormat("cccc d LLL")} leaves no break longer than ${fmtDuration(Math.max(0, load.longestFreeMinutes))} for rest or recovery.` });
    }
  }
  return out;
}

function asPseudo(c: Candidate): Occurrence {
  return {
    key: `candidate:${c.title}:${c.start}`, activityId: "", occurrenceDate: "", title: c.title, start: c.start, end: c.end,
    allDay: !!c.allDay, timezone: "", categoryId: null, classification: "flexible", priority: 3, kind: "event", location: null,
    groupKey: null, recurring: false, status: "scheduled", modified: false,
    prepMinutes: c.prepMinutes ?? 0, travelMinutes: c.travelMinutes ?? 0, recoveryMinutes: c.recoveryMinutes ?? 0,
  };
}

/** Busy minutes and longest free gap during the waking day. */
export function dayLoad(date: string, occ: Occurrence[], ctx: Pick<DetectContext, "profile" | "tz">) {
  const dayStart = zonedDateTime(date, ctx.profile.wake_time, ctx.tz);
  let dayEnd = zonedDateTime(date, ctx.profile.bedtime, ctx.tz);
  if (dayEnd <= dayStart) dayEnd = dayEnd.plus({ days: 1 });
  const day = Interval.fromDateTimes(dayStart, dayEnd);
  const parts: Interval[] = [];
  for (const o of occ) {
    if (o.allDay || o.status === "cancelled") continue;
    const i = bufferedInterval(o).intersection(day);
    if (i && i.isValid && i.length("minutes") > 0) parts.push(i);
  }
  const merged = Interval.merge(parts);
  const busyMinutes = Math.round(merged.reduce((s, i) => s + i.length("minutes"), 0));
  const free = day.difference(...merged);
  const longestFreeMinutes = Math.round(free.reduce((m, i) => Math.max(m, i.length("minutes")), 0));
  return { busyMinutes, longestFreeMinutes, free };
}
