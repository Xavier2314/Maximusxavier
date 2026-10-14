import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { expandDays, expandOccurrences } from "@/lib/schedule/occurrences";
import { analyzeDrafts, computeProposed, normalizeSelection } from "@/lib/schedule/analyze";
import { detectConflicts } from "@/lib/schedule/conflicts";
import { findFreeSlots } from "@/lib/schedule/freeSlots";
import { ActivityDraftSchema } from "@/lib/schedule/draft";
import { seededData, PREFS, PROFILE } from "./helpers";
import type { ActivityRow } from "@/lib/types";
import { fmtTime } from "@/lib/time";

const TZ = "Africa/Lagos";
const titlesAt = (date: string, data = seededData()) =>
  expandDays(data.activities, data.exceptions, date, date, TZ).map((o) => `${fmtTime(o.start, TZ)} ${o.title}`);

describe("initial weekly routine", () => {
  const data = seededData();

  it("loads every seeded activity", () => {
    expect(data.activities).toHaveLength(17);
    expect(data.rules.length).toBeGreaterThan(20);
  });

  it("Bible devotion appears every day 5:00–6:00 AM, weekends included", () => {
    const occ = expandDays(data.activities, [], "2026-10-12", "2026-11-08", TZ).filter((o) => o.groupKey === "devotion");
    expect(occ).toHaveLength(28);
    for (const o of occ) {
      expect(fmtTime(o.start, TZ)).toBe("5:00 AM");
      expect(fmtTime(o.end, TZ)).toBe("6:00 AM");
    }
  });

  it("gym appears only on Monday, Wednesday, Friday and Saturday", () => {
    const occ = expandDays(data.activities, [], "2026-10-12", "2026-10-25", TZ).filter((o) => o.title === "Gym workout");
    const weekdays = [...new Set(occ.map((o) => DateTime.fromISO(o.start).setZone(TZ).weekday))].sort();
    expect(weekdays).toEqual([1, 3, 5, 6]);
    expect(occ).toHaveLength(8);
    expect(titlesAt("2026-10-14")).toEqual(expect.arrayContaining([
      "6:00 AM Prepare for the gym", "6:30 AM Travel to the gym", "7:00 AM Gym workout", "8:00 AM Return home", "8:30 AM Shower, breakfast & recovery",
    ]));
    expect(titlesAt("2026-10-13").some((t) => t.includes("Gym"))).toBe(false); // Tuesday recovery
  });

  it("keyboard lessons appear at the correct times", () => {
    expect(titlesAt("2026-10-19")).toContain("10:00 AM Keyboard lesson");
    expect(titlesAt("2026-10-20")).toContain("1:00 PM Keyboard lesson");
    expect(titlesAt("2026-10-22")).toContain("1:00 PM Keyboard lesson");
    expect(titlesAt("2026-10-21").some((t) => t.includes("Keyboard lesson"))).toBe(false);
  });

  it("keyboard practice appears on the right days and times", () => {
    expect(titlesAt("2026-10-19")).toContain("1:00 PM Keyboard practice");
    expect(titlesAt("2026-10-21")).toContain("10:00 AM Keyboard practice");
    expect(titlesAt("2026-10-22")).toContain("9:00 AM Keyboard practice");
    expect(titlesAt("2026-10-23")).toContain("10:00 AM Keyboard practice");
    expect(titlesAt("2026-10-24")).toContain("11:00 AM Keyboard practice");
  });

  it("office training recurs Monday–Friday 4–7 PM starting 19 October 2026", () => {
    const before = expandDays(data.activities, [], "2026-10-12", "2026-10-18", TZ).filter((o) => o.title === "Office training");
    expect(before).toHaveLength(0);
    const after = expandDays(data.activities, [], "2026-10-19", "2026-11-01", TZ).filter((o) => o.title === "Office training");
    expect(after).toHaveLength(10);
    expect(after[0].occurrenceDate).toBe("2026-10-19");
    expect(fmtTime(after[0].start, TZ)).toBe("4:00 PM");
    expect(fmtTime(after[0].end, TZ)).toBe("7:00 PM");
  });

  it("podcast sessions appear correctly", () => {
    expect(titlesAt("2026-10-20")).toContain("9:00 AM Podcast research & scripting");
    expect(titlesAt("2026-10-23")).toContain("11:00 AM Podcast planning & preparation");
    expect(titlesAt("2026-10-24")).toContain("1:00 PM Podcast recording & editing");
  });

  it("Sunday keeps only devotion and the 4 PM weekly review", () => {
    expect(titlesAt("2026-10-18")).toEqual(["5:00 AM Bible study & prayer", "4:00 PM Weekly review & planning"]);
  });

  it("seeded routine itself has no internal overlaps", () => {
    const occ = expandDays(data.activities, [], "2026-10-19", "2026-10-25", TZ);
    for (let i = 0; i < occ.length; i++)
      for (let j = i + 1; j < occ.length; j++) {
        const a = occ[i], b = occ[j];
        const overlap = a.start < b.end && b.start < a.end;
        expect(overlap, `${a.title} ${a.start} vs ${b.title} ${b.start}`).toBe(false);
      }
  });
});

describe("recurrence & timezone handling", () => {
  const base: ActivityRow = {
    id: "x", title: "Late shift", description: null, notes: null, category_id: null, location: null, kind: "event",
    classification: "flexible", priority: 3, start_date: "2026-10-30", start_time: "23:00", duration_minutes: 120,
    all_day: false, end_date: null, timezone: null, recurrence: { freq: "daily" }, prep_minutes: 0, travel_minutes: 0,
    recovery_minutes: 0, checklist: [], group_key: null, habit_id: null, status: "active", source: "manual", trip_id: null,
    series_parent_id: null, dedupe_key: "x",
  };

  it("activities crossing midnight show up on the following day too", () => {
    const occ = expandDays([base], [], "2026-10-31", "2026-10-31", TZ);
    expect(occ.map((o) => o.occurrenceDate)).toEqual(["2026-10-30", "2026-10-31"]);
  });

  it("keeps wall-clock time across a daylight-saving change when travelling", () => {
    const occ = expandDays([{ ...base, start_time: "05:00", duration_minutes: 60 }], [], "2026-10-31", "2026-11-02", "America/New_York");
    expect(occ.filter((o) => o.occurrenceDate >= "2026-10-31").map((o) => fmtTime(o.start, "America/New_York"))).toEqual(["5:00 AM", "5:00 AM", "5:00 AM"]);
    // and the UTC instant shifts by one hour after DST ends on 1 Nov 2026
    const utc = occ.filter((o) => o.occurrenceDate >= "2026-10-31").map((o) => DateTime.fromISO(o.start).toUTC().hour);
    expect(utc).toEqual([9, 10, 10]);
  });

  it("applies single-occurrence exceptions (cancel + move)", () => {
    const data = seededData();
    const gym = data.activities.find((a) => a.title === "Gym workout")!;
    const exc = [
      { id: "e1", activity_id: gym.id, occurrence_date: "2026-10-19", kind: "cancelled" as const, start_at: null, end_at: null, title: null, note: null },
      { id: "e2", activity_id: gym.id, occurrence_date: "2026-10-21", kind: "modified" as const, start_at: "2026-10-22T07:00:00+01:00", end_at: "2026-10-22T08:00:00+01:00", title: null, note: null },
    ];
    expect(expandDays([gym], exc, "2026-10-19", "2026-10-19", TZ)).toHaveLength(0);
    expect(expandDays([gym], exc, "2026-10-21", "2026-10-21", TZ)).toHaveLength(0);
    const thu = expandDays([gym], exc, "2026-10-22", "2026-10-22", TZ);
    expect(thu).toHaveLength(1);
    expect(thu[0].occurrenceDate).toBe("2026-10-21");
    expect(thu[0].modified).toBe(true);
  });

  it("weekly interval, until and count are respected", () => {
    const a = { ...base, start_date: "2026-10-12", start_time: "10:00", duration_minutes: 60, recurrence: { freq: "weekly" as const, interval: 2, by_weekday: [1] } };
    expect(expandDays([a], [], "2026-10-12", "2026-11-09", TZ).map((o) => o.occurrenceDate)).toEqual(["2026-10-12", "2026-10-26", "2026-11-09"]);
    const b = { ...a, recurrence: { freq: "daily" as const, count: 3 } };
    expect(expandDays([b], [], "2026-10-12", "2026-10-31", TZ)).toHaveLength(3);
    const c = { ...a, recurrence: { freq: "daily" as const, until: "2026-10-14" } };
    expect(expandDays([c], [], "2026-10-12", "2026-10-31", TZ)).toHaveLength(3);
  });
});

describe("conflict detection & AI-free recommendations", () => {
  const data = seededData();
  const now = DateTime.fromISO("2026-10-14T12:00:00", { zone: TZ });

  it("detects the Abuja trip conflicts from the real calendar", () => {
    const trip = ActivityDraftSchema.parse({
      title: "Trip to Abuja", category_key: "travel", kind: "trip", start_date: "2026-10-19", start_time: "09:00",
      duration_minutes: 33 * 60, classification: "fixed",
    });
    const p = analyzeDrafts([trip], data, { now, trip: { destination: "Abuja", prepMinutes: 60 } });
    const hit = p.conflicts.filter((c) => c.type === "overlap").map((c) => `${c.occurrence!.title}@${c.occurrence!.occurrenceDate}`);
    expect(hit).toEqual(expect.arrayContaining([
      "Keyboard lesson@2026-10-19", "Office training@2026-10-19", "Keyboard lesson@2026-10-20", "Office training@2026-10-20",
      "Keyboard practice@2026-10-19", "Podcast research & scripting@2026-10-20", "Shower, breakfast & recovery@2026-10-19",
    ]));
    // devotion is before departure on Monday and not overlapped
    expect(hit.some((h) => h.startsWith("Bible"))).toBe(false);

    const recs = p.recommendations;
    // fixed commitments are flagged, never cancelled by default
    const lessonRecs = recs.filter((r) => r.targets?.some((t) => t.title === "Keyboard lesson" && t.occurrenceDate === "2026-10-19"));
    expect(lessonRecs.find((r) => r.action === "flag_occurrence")?.selected).toBe(true);
    expect(lessonRecs.find((r) => r.action === "cancel_occurrence")?.selected).toBe(false);
    const officeRecs = recs.filter((r) => r.targets?.some((t) => t.title === "Office training"));
    expect(officeRecs.filter((r) => r.selected).every((r) => r.action === "flag_occurrence")).toBe(true);
    // flexible keyboard practice gets moved to another day
    const practice = recs.find((r) => r.action === "move_occurrence" && r.targets?.[0].title === "Keyboard practice");
    expect(practice).toBeTruthy();
    expect(practice!.targets![0].newStart!.slice(0, 10) > "2026-10-20").toBe(true);
    // gym morning is handled as one unit (moved or skipped together)
    const gym = recs.filter((r) => r.selected && r.targets?.some((t) => t.groupKey === "gym-morning"));
    expect(gym).toHaveLength(1);
    expect(gym[0].targets).toHaveLength(5);
    // a travel preparation block is proposed the day before
    const prep = recs.find((r) => r.action === "create_activity" && r.draft?.title.startsWith("Pack"));
    expect(prep?.draft?.start_date).toBe("2026-10-18");
    // devotion kept on trip days
    expect(recs.some((r) => r.action === "note" && r.title.startsWith("Bible devotion on Tue"))).toBe(true);
  });

  it("proposed moves never land on top of other commitments", () => {
    const trip = ActivityDraftSchema.parse({ title: "Trip", category_key: "travel", kind: "trip", start_date: "2026-10-19", start_time: "09:00", duration_minutes: 33 * 60 });
    const p = analyzeDrafts([trip], data, { now, trip: { destination: "Abuja", prepMinutes: 60 } });
    const moves = p.recommendations.filter((r) => r.action === "move_occurrence" && r.selected);
    const after = expandOccurrences(data.activities, [], DateTime.fromISO("2026-10-18", { zone: TZ }), DateTime.fromISO("2026-10-27", { zone: TZ }), TZ);
    const movedKeys = new Set(moves.flatMap((m) => m.targets!.map((t) => t.key)));
    for (const m of moves)
      for (const t of m.targets!) {
        for (const o of after) {
          if (movedKeys.has(o.key)) continue;
          expect(t.newStart! < o.end && o.start < t.newEnd!, `${t.title} → ${t.newStart} clashes with ${o.title}`).toBe(false);
        }
      }
  });

  it("a simple meeting in free time has no conflicts", () => {
    const meeting = ActivityDraftSchema.parse({ title: "Business meeting", start_date: "2026-10-15", start_time: "11:00", duration_minutes: 60 });
    const p = analyzeDrafts([meeting], data, { now });
    expect(p.conflicts.filter((c) => c.type === "overlap")).toHaveLength(0);
    expect(p.recommendations[0]).toMatchObject({ action: "create_activity", selected: true });
  });

  it("warns about late events that cut into sleep", () => {
    const late = ActivityDraftSchema.parse({ title: "Team call", start_date: "2026-10-15", start_time: "20:00", duration_minutes: 120 });
    const p = analyzeDrafts([late], data, { now });
    expect(p.conflicts.some((c) => c.type === "sleep")).toBe(true);
  });

  it("flags duplicates", () => {
    const occ = expandDays(data.activities, [], "2026-10-21", "2026-10-21", TZ);
    const c = detectConflicts([{ title: "Gym Workout", start: "2026-10-21T07:00:00+01:00", end: "2026-10-21T08:00:00+01:00" }],
      { existing: occ, profile: PROFILE, preferences: PREFS, tz: TZ });
    expect(c[0].type).toBe("duplicate");
  });

  it("selection normalisation allows only one choice per affected item", () => {
    const trip = ActivityDraftSchema.parse({ title: "Trip", start_date: "2026-10-19", start_time: "09:00", duration_minutes: 33 * 60 });
    const p = analyzeDrafts([trip], data, { now });
    const all = p.recommendations.map((r) => r.id);
    const norm = normalizeSelection(p, all);
    const groups = norm.map((id) => p.recommendations.find((r) => r.id === id)!.choiceGroup).filter(Boolean);
    expect(new Set(groups).size).toBe(groups.length);
    const proposed = computeProposed(p, new Set(norm));
    expect(proposed.some((x) => x.change === "new")).toBe(true);
  });
});

describe("free-slot finder", () => {
  const data = seededData();
  it("finds two hours for podcast recording without touching sleep, buffers or Sunday rest", () => {
    const occ = expandDays(data.activities, [], "2026-10-19", "2026-10-25", TZ);
    const slots = findFreeSlots({
      occurrences: occ, fromDate: "2026-10-19", toDate: "2026-10-25", tz: TZ, durationMinutes: 120,
      profile: PROFILE, preferences: PREFS, notBefore: DateTime.fromISO("2026-10-19T00:00", { zone: TZ }),
    });
    expect(slots.length).toBeGreaterThan(0);
    for (const s of slots) {
      const st = DateTime.fromISO(s.start).setZone(TZ);
      const en = DateTime.fromISO(s.end).setZone(TZ);
      expect(st.hour).toBeGreaterThanOrEqual(5);
      expect(en <= st.set({ hour: 20, minute: 30 })).toBe(true); // bedtime 9 PM minus 30 min wind-down
      if (st.weekday === 7) expect(st.hour >= 16).toBe(true);
      for (const o of occ) expect(s.start < o.end && o.start < s.end).toBe(false);
    }
  });
});

describe("trip load checks", () => {
  it("does not report overload/no-rest for the trip itself", () => {
    const data = seededData();
    const trip = ActivityDraftSchema.parse({ title: "Trip", category_key: "travel", kind: "trip", start_date: "2026-10-19", start_time: "09:00", duration_minutes: 33 * 60 });
    const p = analyzeDrafts([trip], data, { now: DateTime.fromISO("2026-10-14T12:00", { zone: TZ }) });
    expect(p.conflicts.some((c) => c.type === "overload" || c.type === "no_rest")).toBe(false);
  });
  it("still reports overload for a long day of new commitments", () => {
    const data = seededData();
    const busy = ActivityDraftSchema.parse({ title: "Workshop", start_date: "2026-10-19", start_time: "12:00", duration_minutes: 240 });
    const p = analyzeDrafts([busy], data, { now: DateTime.fromISO("2026-10-14T12:00", { zone: TZ }) });
    expect(p.conflicts.some((c) => c.type === "overload")).toBe(true);
  });
});
