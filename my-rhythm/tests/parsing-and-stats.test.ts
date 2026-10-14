import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { fallbackParse } from "@/lib/ai/fallbackParse";
import { resolveParsed } from "@/lib/ai/toDraft";
import { generatePlan, readingLabel, TOTAL_CHAPTERS, BOOKS } from "@/lib/bible";
import { categoryStats, dailyProgress, streaks } from "@/lib/stats";
import { ParsedRequestSchema } from "@/lib/ai/schema";

const TZ = "Africa/Lagos";
// Wednesday 14 October 2026, 10:00 in Lagos
const NOW = DateTime.fromISO("2026-10-14T10:00", { zone: TZ });

describe("natural-language scheduling (offline parser)", () => {
  it("resolves 'tomorrow at 11 AM' with the real date in Africa/Lagos", () => {
    const p = fallbackParse("I have a business meeting tomorrow at 11 AM.", NOW);
    expect(p).toMatchObject({ intent: "create", date: "2026-10-15", start_time: "11:00", kind: "meeting" });
    const r = resolveParsed(p, TZ);
    expect(r.status).toBe("ready");
    expect(r.drafts[0]).toMatchObject({ title: "Business meeting", start_date: "2026-10-15", start_time: "11:00", classification: "fixed", duration_minutes: 60 });
    expect(r.assumptions.join(" ")).toMatch(/1 hour/);
  });

  it("parses a ranged event", () => {
    const p = fallbackParse("Add a leadership event on Saturday from 10 AM to 4 PM.", NOW);
    const r = resolveParsed(p, TZ);
    expect(r.status).toBe("ready");
    expect(r.drafts[0]).toMatchObject({ start_date: "2026-10-17", start_time: "10:00", duration_minutes: 360, category_key: "events" });
  });

  it("parses a trip with a return", () => {
    const p = fallbackParse("I am travelling to Abuja next Monday at 9 AM and returning Tuesday evening.", NOW);
    expect(p.intent).toBe("trip");
    const r = resolveParsed(p, TZ);
    expect(r.status).toBe("ready");
    expect(r.trip?.destination).toBe("Abuja");
    expect(r.drafts[0]).toMatchObject({ kind: "trip", start_date: "2026-10-19", start_time: "09:00", category_key: "travel" });
    expect(DateTime.fromISO(r.trip!.returnAt).setZone(TZ).toFormat("yyyy-MM-dd HH:mm")).toBe("2026-10-20 18:00");
  });

  it("does not guess a missing start time", () => {
    const p = fallbackParse("Add dentist appointment on Friday", NOW);
    const r = resolveParsed(p, TZ);
    expect(r.status).toBe("needs_info");
    expect(r.missing).toContain("start time");
    expect(r.drafts).toHaveLength(0);
  });

  it("understands find-time requests", () => {
    const p = fallbackParse("Find two hours for my podcast recording this week.", NOW);
    // "two" isn't numeric for the offline parser — it asks instead of guessing
    expect(["find_time", "unclear", "create"]).toContain(p.intent);
    const q = fallbackParse("Find 2 hours for my podcast recording this week", NOW);
    expect(q.intent).toBe("find_time");
    expect(q.find_time).toMatchObject({ duration_minutes: 120, range_start: "2026-10-14" });
    expect(q.category_key).toBe("podcast");
  });

  it("refuses invalid trips (return before departure)", () => {
    const p = ParsedRequestSchema.parse({
      intent: "trip", title: "Trip", category_key: "travel", kind: "trip", date: "2026-10-20", start_time: "09:00", end_time: null, end_date: null,
      duration_minutes: null, all_day: false, location: null, notes: null, recurrence: null, classification: "fixed",
      trip: { destination: "Abuja", return_date: "2026-10-19", return_time: "18:00", travel_method: null }, find_time: null, missing: [], clarification: null, assumptions: [],
    });
    expect(resolveParsed(p, TZ).status).toBe("needs_info");
  });
});

describe("Bible reading plan generator", () => {
  it("covers all 1,189 chapters exactly once in a year", () => {
    const plan = generatePlan(BOOKS.map((b) => b[0]), "2026-10-14", 365);
    expect(TOTAL_CHAPTERS).toBe(1189);
    const all = plan.flatMap((d) => d.readings.map((r) => `${r.book} ${r.chapter}`));
    expect(all).toHaveLength(1189);
    expect(new Set(all).size).toBe(1189);
    expect(plan).toHaveLength(365);
    const sizes = plan.map((d) => d.readings.length);
    expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
    expect(plan[0].date).toBe("2026-10-14");
    expect(plan[364].date).toBe("2027-10-13");
  });

  it("labels readings compactly", () => {
    expect(readingLabel([{ book: "John", chapter: 1 }, { book: "John", chapter: 2 }, { book: "John", chapter: 3 }, { book: "Acts", chapter: 1 }])).toBe("John 1–3, Acts 1");
  });
});

describe("statistics use only real records", () => {
  const mk = (state: string, cat = "gym", title = "Gym workout") => ({ start: "2026-10-14T07:00:00+01:00", end: "2026-10-14T08:00:00+01:00", state, categoryKey: cat, title, groupKey: cat === "gym" ? "gym-morning" : null });

  it("never counts upcoming or missed as completed", () => {
    const s = categoryStats([mk("completed"), mk("missed"), mk("upcoming"), mk("skipped")]);
    expect(s.gym).toMatchObject({ completed: 1, missed: 1, upcoming: 1, skipped: 1, rate: 33 });
  });

  it("gym satellites (travel/prep) are not counted as separate sessions", () => {
    const s = categoryStats([mk("completed"), mk("missed", "gym", "Travel to the gym")]);
    expect(s.gym.scheduled).toBe(1);
  });

  it("daily progress excludes cancelled items", () => {
    expect(dailyProgress([mk("completed", "spiritual", "Bible"), mk("upcoming", "keyboard", "Lesson"), mk("cancelled", "office", "Office")])).toEqual({ done: 1, total: 2, percent: 50 });
  });

  it("streaks", () => {
    const s = streaks(["2026-10-10", "2026-10-11", "2026-10-12", "2026-10-13", "2026-10-01", "2026-10-02"], "2026-10-14");
    expect(s.current).toBe(4); // alive until today is missed entirely
    expect(s.longest).toBe(4);
    expect(streaks([], "2026-10-14")).toMatchObject({ current: 0, longest: 0 });
  });
});
