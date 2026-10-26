import { DateTime } from "luxon";
import type { Classification, Occurrence, ScheduleData } from "../types";
import { expandOccurrences } from "./occurrences";
import { detectConflicts, summarize, type Candidate, type Conflict, type OccurrenceSummary } from "./conflicts";
import { findFreeSlots } from "./freeSlots";
import { draftCandidates, type ActivityDraft } from "./draft";
import { fmtTime } from "../time";

export type RecAction =
  | "create_activity"
  | "move_occurrence"
  | "cancel_occurrence"
  | "skip_occurrence"
  | "flag_occurrence"
  | "note";

export interface RecTarget extends OccurrenceSummary {
  newStart?: string;
  newEnd?: string;
}

export interface Recommendation {
  id: string;
  action: RecAction;
  title: string;
  reason: string;
  selected: boolean;
  /** recommendations sharing a choiceGroup are alternatives: select at most one */
  choiceGroup?: string;
  classification?: Classification;
  targets?: RecTarget[];
  draft?: ActivityDraft;
}

export interface ProposedItem {
  title: string;
  start: string;
  end: string;
  change: "new" | "moved" | "skipped" | "cancelled" | "flagged";
  fromStart?: string;
  fromEnd?: string;
}

export interface ProposalPayload {
  version: 1;
  generatedAt: string;
  timezone: string;
  drafts: ActivityDraft[];
  original: OccurrenceSummary[];
  conflicts: Conflict[];
  recommendations: Recommendation[];
  trip?: { destination: string; tripId?: string } | null;
}

export interface AnalyzeOptions {
  now?: DateTime;
  trip?: { destination: string; prepMinutes: number; tripId?: string } | null;
}

const STRICTNESS: Record<Classification, number> = { fixed: 3, essential: 2, flexible: 1, optional: 0 };

function partOfDayWindow(start: DateTime): [string, string] {
  const h = start.hour;
  if (h < 12) return ["05:00", "12:00"];
  if (h < 17) return ["12:00", "17:00"];
  return ["17:00", "23:00"];
}

function pseudoOcc(c: Candidate, key: string): Occurrence {
  return {
    key, activityId: "", occurrenceDate: "", title: c.title, start: c.start, end: c.end, allDay: !!c.allDay,
    timezone: "", categoryId: null, classification: "fixed", priority: 1, kind: "event", location: null, groupKey: null,
    recurring: false, status: "scheduled", modified: false, prepMinutes: c.prepMinutes ?? 0,
    travelMinutes: c.travelMinutes ?? 0, recoveryMinutes: c.recoveryMinutes ?? 0,
  };
}

/**
 * Analyse proposed new activities against the real schedule and produce
 * conflicts + recommendations. Pure & deterministic: the AI layer may only
 * explain/rank these, never invent changes.
 */
export function analyzeDrafts(drafts: ActivityDraft[], data: ScheduleData, opts: AnalyzeOptions = {}): ProposalPayload {
  const tz = data.profile.timezone;
  const now = opts.now ?? DateTime.now().setZone(tz);
  const owner: number[] = [];
  const candidates = drafts.flatMap((d, i) => {
    const cs = draftCandidates(d, tz);
    cs.forEach(() => owner.push(i));
    return cs;
  });
  const starts = candidates.map((c) => DateTime.fromISO(c.start));
  const ends = candidates.map((c) => DateTime.fromISO(c.end));
  const rangeStart = (starts.length ? DateTime.min(...starts)! : now).minus({ days: 1 }).startOf("day");
  const rangeEnd = (ends.length ? DateTime.max(...ends)! : now).plus({ days: 8 }).endOf("day");
  const existing = expandOccurrences(data.activities, data.exceptions, rangeStart, rangeEnd, tz);

  const ctx = { existing, profile: data.profile, preferences: data.preferences, tz };
  const conflicts = detectConflicts(candidates, ctx);
  const recs: Recommendation[] = [];
  let n = 0;
  const rid = () => `r${++n}`;
  const dayLabel = (iso: string) => DateTime.fromISO(iso).setZone(tz).toFormat("ccc d LLL");
  const span = (o: { start: string; end: string }) => `${dayLabel(o.start)}, ${fmtTime(o.start, tz)}–${fmtTime(o.end, tz)}`;

  // 1) The new activities themselves.
  drafts.forEach((d, i) => {
    const dup = conflicts.some((c) => c.type === "duplicate" && owner[c.candidateIndex] === i);
    recs.push({
      id: rid(), action: "create_activity", draft: d, selected: !dup, classification: d.classification,
      title: `Add “${d.title}”`,
      reason: dup ? "This looks like a duplicate of something already on your calendar — left unselected." : "The new activity you asked for.",
    });
  });

  // 2) Affected existing occurrences, grouped into units (a gym morning moves as one).
  const overlapped = conflicts.filter((c) => c.type === "overlap" && c.occurrence);
  const units = new Map<string, Occurrence[]>();
  for (const c of overlapped) {
    const o = existing.find((e) => e.key === c.occurrence!.key)!;
    const ukey = `${o.groupKey ?? o.activityId}:${o.occurrenceDate}`;
    if (units.has(ukey)) continue;
    const members = o.groupKey
      ? existing.filter((e) => e.groupKey === o.groupKey && e.occurrenceDate === o.occurrenceDate)
      : [o];
    units.set(ukey, members);
  }

  // Everything chosen so far is "busy" for subsequent slot searches.
  const reserved: Occurrence[] = candidates.map((c, i) => pseudoOcc(c, `candidate:${i}`));
  const affectedKeys = new Set<string>();
  for (const members of units.values()) members.forEach((m) => affectedKeys.add(m.key));
  let practiceShortfall = 0;

  for (const [ukey, members] of units) {
    members.sort((a, b) => (a.start < b.start ? -1 : 1));
    const first = members[0];
    const unitStart = DateTime.fromISO(first.start);
    const unitEnd = DateTime.max(...members.map((m) => DateTime.fromISO(m.end)))!;
    const durationMinutes = Math.round(unitEnd.diff(unitStart, "minutes").minutes);
    const cls = members.reduce<Classification>((acc, m) => (STRICTNESS[m.classification] > STRICTNESS[acc] ? m.classification : acc), "optional");
    const label = members.length > 1 ? `${first.groupKey === "gym-morning" ? "Gym morning routine" : first.title} (${members.length} items)` : first.title;
    const targets: RecTarget[] = members.map(summarize);
    const choiceGroup = ukey;
    const pool = [...existing.filter((e) => !affectedKeys.has(e.key)), ...reserved];

    const tryMove = (fromDate: string, toDate: string, sameActivityElsewhere: boolean) => {
      const [ws, we] = partOfDayWindow(unitStart.setZone(tz));
      const slots = findFreeSlots({
        occurrences: pool, fromDate, toDate, tz, durationMinutes, profile: data.profile, preferences: data.preferences,
        windowStart: ws, windowEnd: we, notBefore: now, maxResults: 20,
      });
      return slots.find((s) => {
        if (sameActivityElsewhere) return true;
        // avoid stacking two sessions of the same activity on one day
        return !pool.some((p) => p.activityId === first.activityId && DateTime.fromISO(p.start).setZone(tz).toISODate() === s.date);
      });
    };

    const pushMove = (slot: { start: string }, reason: string) => {
      const delta = DateTime.fromISO(slot.start).diff(unitStart, "minutes").minutes;
      const moved = targets.map((t) => ({
        ...t,
        newStart: DateTime.fromISO(t.start).plus({ minutes: delta }).setZone(tz).toISO()!,
        newEnd: DateTime.fromISO(t.end).plus({ minutes: delta }).setZone(tz).toISO()!,
      }));
      moved.forEach((m, i) => reserved.push({ ...members[i], key: `moved:${m.key}`, start: m.newStart!, end: m.newEnd! }));
      recs.push({
        id: rid(), action: "move_occurrence", selected: true, choiceGroup, classification: cls, targets: moved,
        title: `Move ${label} to ${span({ start: moved[0].newStart!, end: moved[moved.length - 1].newEnd! })}`,
        reason,
      });
    };

    const isPractice = /practice/i.test(first.title);
    const sameDay = unitStart.setZone(tz).toISODate()!;
    const weekEnd = DateTime.max(unitStart.setZone(tz).endOf("week"), unitStart.setZone(tz).plus({ days: 4 })).toISODate()!;

    if (cls === "fixed") {
      recs.push({
        id: rid(), action: "flag_occurrence", selected: true, choiceGroup, classification: cls, targets,
        title: `Flag ${label} on ${span(first)} as needing rescheduling`,
        reason: "This is a fixed commitment, so I won't move or cancel it on my own. Flagging it keeps it visible so you can make arrangements (e.g. tell your teacher or supervisor).",
      });
      recs.push({
        id: rid(), action: "cancel_occurrence", selected: false, choiceGroup, classification: cls, targets,
        title: `Cancel ${label} on ${dayLabel(first.start)}`,
        reason: "Only if you have already agreed this with the people involved.",
      });
    } else if (cls === "essential") {
      const slot = tryMove(sameDay, sameDay, true);
      if (slot) {
        pushMove(slot, "Essential to you, so I kept it on the same day at the nearest time that is free.");
      } else {
        recs.push({
          id: rid(), action: "flag_occurrence", selected: true, choiceGroup, classification: cls, targets,
          title: `Keep ${label} on ${dayLabel(first.start)} but flag it for adjustment`,
          reason: "Essential to you and there is no free time that day — consider a shorter session at another moment.",
        });
      }
    } else if (cls === "flexible") {
      const slot = tryMove(sameDay, weekEnd, false);
      if (slot) {
        pushMove(slot, `Flexible activity — moved to the next suitable free time ${first.groupKey === "gym-morning" ? "in the morning" : "at a similar time of day"} so you don't lose the session.`);
        recs.push({
          id: rid(), action: "skip_occurrence", selected: false, choiceGroup, classification: cls, targets,
          title: `Skip ${label} on ${dayLabel(first.start)} instead`,
          reason: "If you'd rather rest than catch up this week.",
        });
      } else {
        if (isPractice) practiceShortfall += durationMinutes;
        recs.push({
          id: rid(), action: "skip_occurrence", selected: true, choiceGroup, classification: cls, targets,
          title: `Skip ${label} on ${dayLabel(first.start)}`,
          reason: "No suitable free time remains this week without crowding your rest.",
        });
        recs.push({
          id: rid(), action: "flag_occurrence", selected: false, choiceGroup, classification: cls, targets,
          title: `Flag ${label} to reschedule later`,
          reason: "Keep it visible so you can find time for it yourself.",
        });
      }
    } else {
      recs.push({
        id: rid(), action: "skip_occurrence", selected: true, choiceGroup, classification: cls, targets,
        title: `Skip ${label} on ${dayLabel(first.start)}`,
        reason: "Optional activity — fine to skip when something more important comes up.",
      });
    }
  }

  // 3) Buffers, sleep, load — explained as notes (no automatic changes).
  for (const c of conflicts) {
    if (c.type === "sleep" || c.type === "overload" || c.type === "no_rest" || c.type === "buffer" || c.type === "protected_rest") {
      recs.push({ id: rid(), action: "note", selected: false, title: c.message, reason: noteAdvice(c.type) });
    }
  }
  if (practiceShortfall > 0) {
    recs.push({
      id: rid(), action: "note", selected: false,
      title: `You may miss ${practiceShortfall} min of keyboard practice this week.`,
      reason: "Ask “Where can I fit keyboard practice?” and I'll look for time next week.",
    });
  }

  // 4) Trip helpers: preparation + keeping devotion.
  if (opts.trip && candidates.length) {
    const depart = DateTime.fromISO(candidates[0].start).setZone(tz);
    const ret = DateTime.fromISO(candidates[0].end).setZone(tz);
    const dayBefore = depart.minus({ days: 1 }).toISODate()!;
    const prepSlots = findFreeSlots({
      occurrences: [...existing, ...reserved], fromDate: dayBefore, toDate: dayBefore, tz,
      durationMinutes: Math.max(15, opts.trip.prepMinutes), profile: data.profile, preferences: data.preferences,
      windowStart: "17:00", notBefore: now, maxResults: 1, respectProtectedRest: false,
    });
    const prepSlot = prepSlots[0] ?? findFreeSlots({
      occurrences: [...existing, ...reserved], fromDate: dayBefore, toDate: dayBefore, tz,
      durationMinutes: Math.max(15, opts.trip.prepMinutes), profile: data.profile, preferences: data.preferences,
      notBefore: now, maxResults: 1, respectProtectedRest: false,
    })[0];
    if (prepSlot) {
      const s = DateTime.fromISO(prepSlot.start).setZone(tz);
      recs.push({
        id: rid(), action: "create_activity", selected: true,
        title: `Add “Pack & prepare for ${opts.trip.destination}” on ${span(prepSlot)}`,
        reason: "A preparation block the day before, with reminders, so nothing is rushed.",
        draft: {
          title: `Pack & prepare for ${opts.trip.destination}`, category_key: "travel", kind: "task",
          start_date: s.toISODate()!, start_time: s.toFormat("HH:mm"), duration_minutes: Math.max(15, opts.trip.prepMinutes),
          all_day: false, classification: "flexible", priority: 2, prep_minutes: 0, travel_minutes: 0, recovery_minutes: 0,
          source: "travel", trip_id: opts.trip.tripId ?? null,
          checklist: ["Tickets / booking confirmation", "ID", "Clothes", "Chargers", "Bible & journal", "Medication"].map((t, i) => ({ id: `p${i}`, text: t })),
          reminders: [{ anchor: "start", offset_minutes: -15 }, { anchor: "start", offset_minutes: 0 }],
        },
      });
    }
    const devotions = existing.filter((o) => o.groupKey === "devotion" && DateTime.fromISO(o.start) >= depart.startOf("day") && DateTime.fromISO(o.start) <= ret.endOf("day"));
    for (const dv of devotions) {
      if (affectedKeys.has(dv.key)) continue;
      recs.push({
        id: rid(), action: "note", selected: false,
        title: `Bible devotion on ${dayLabel(dv.start)} stays at ${fmtTime(dv.start, tz)}.`,
        reason: DateTime.fromISO(dv.start) > depart ? "You'll be away — keep the same time wherever you are; reminders still arrive on your phone." : "It finishes before you leave.",
      });
    }
    recs.push({
      id: rid(), action: "note", selected: false,
      title: `Keep ${ret.toFormat("cccc")} evening light after you return.`,
      reason: "Travel is tiring — protecting rest helps you restart your routine the next morning.",
    });
  }

  return {
    version: 1,
    generatedAt: now.toISO()!,
    timezone: tz,
    drafts,
    original: [...units.values()].flat().map(summarize),
    conflicts,
    recommendations: recs,
    trip: opts.trip ? { destination: opts.trip.destination, tripId: opts.trip.tripId } : null,
  };
}

function noteAdvice(t: Conflict["type"]): string {
  switch (t) {
    case "sleep":
      return "Sleep is one of your top priorities. If you can, choose an earlier time.";
    case "overload":
      return "Consider skipping or moving an optional or flexible item that day.";
    case "no_rest":
      return "Try to protect at least one short break for rest and recovery.";
    case "buffer":
      return "Add travel or preparation time, or start a little later.";
    case "protected_rest":
      return "You've reserved this time for rest. It's your call whether to use it.";
    default:
      return "";
  }
}

/** The schedule as it would look if the selected recommendations were applied. */
export function computeProposed(payload: ProposalPayload, selected: Set<string>): ProposedItem[] {
  const out: ProposedItem[] = [];
  for (const r of payload.recommendations) {
    if (!selected.has(r.id)) continue;
    if (r.action === "create_activity" && r.draft) {
      for (const c of draftCandidates(r.draft, payload.timezone, 7, 7)) out.push({ title: c.title, start: c.start, end: c.end, change: "new" });
    }
    for (const t of r.targets ?? []) {
      if (r.action === "move_occurrence") out.push({ title: t.title, start: t.newStart!, end: t.newEnd!, change: "moved", fromStart: t.start, fromEnd: t.end });
      if (r.action === "skip_occurrence") out.push({ title: t.title, start: t.start, end: t.end, change: "skipped" });
      if (r.action === "cancel_occurrence") out.push({ title: t.title, start: t.start, end: t.end, change: "cancelled" });
      if (r.action === "flag_occurrence") out.push({ title: t.title, start: t.start, end: t.end, change: "flagged" });
    }
  }
  return out.sort((a, b) => (a.start < b.start ? -1 : 1));
}

/** Selection validity: at most one choice per choiceGroup. */
export function normalizeSelection(payload: ProposalPayload, ids: string[]): string[] {
  const chosen = new Map<string, string>();
  const out: string[] = [];
  for (const id of ids) {
    const r = payload.recommendations.find((x) => x.id === id);
    if (!r || r.action === "note") continue;
    if (r.choiceGroup) {
      if (chosen.has(r.choiceGroup)) continue;
      chosen.set(r.choiceGroup, id);
    }
    out.push(id);
  }
  return out;
}
