import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { fallbackPlan, planToDrafts, type Plan } from "@/lib/ai/tasks";
import { expandDays } from "@/lib/schedule/occurrences";
import { seededData } from "./helpers";

const TZ = "Africa/Lagos";
const NOW = DateTime.fromISO("2026-10-14T12:10", { zone: TZ }); // Wednesday

const item = (o: Partial<Plan["items"][number]>): Plan["items"][number] => ({
  type: "task", title: "Task", category_key: "personal", date: null, start_time: null, duration_minutes: null, recurrence: null,
  destination: null, return_date: null, return_time: null, priority: null, notes: null, ...o,
});

describe("talk it through → task list", () => {
  it("offline splitter separates several spoken items and keeps stated times", () => {
    const p = fallbackPlan("I want to call Mum at 6pm, then go to the market and I need to practise keyboard tomorrow at 7 AM. Remind me to drink water", NOW);
    const titles = p.items.map((i) => i.title.toLowerCase());
    expect(titles.some((t) => t.includes("call mum"))).toBe(true);
    expect(titles.some((t) => t.includes("market"))).toBe(true);
    expect(titles.some((t) => t.includes("keyboard"))).toBe(true);
    expect(titles.some((t) => t.includes("drink water"))).toBe(true);
    expect(p.items.find((i) => /call mum/i.test(i.title))!.start_time).toBe("18:00");
    expect(p.items.find((i) => /keyboard/i.test(i.title))).toMatchObject({ date: "2026-10-15", start_time: "07:00", category_key: "keyboard" });
    expect(p.items.find((i) => /water/i.test(i.title))!.type).toBe("reminder");
  });

  it("keeps stated times, places untimed items in free slots, and never double-books", () => {
    const data = seededData("2026-10-12");
    const { placed } = planToDrafts({ summary: "", items: [
      item({ title: "Call Mum", start_time: "18:00", type: "reminder" }),
      item({ title: "Buy groceries", duration_minutes: 60 }),
      item({ title: "Read a chapter", duration_minutes: 30 }),
    ] }, data, NOW);
    expect(placed.map((p) => p.placed)).toEqual(["said", "suggested", "suggested"]);
    const drafts = placed.map((p) => p.draft!);
    expect(drafts[0]).toMatchObject({ start_date: "2026-10-14", start_time: "18:00" });
    expect(drafts[0].reminders![0].message).toBe("It's 6:00 PM — Call Mum.");
    expect(drafts[1].reminders!.find((r) => r.offset_minutes === 0)!.message).toMatch(/^It's \d{1,2}:\d{2} [AP]M — time for Buy groceries\.$/);
    // suggested slots don't overlap the routine or each other
    const occ = expandDays(data.activities, [], "2026-10-14", "2026-10-15", TZ);
    const blocks = drafts.slice(1).map((d) => {
      const s = DateTime.fromISO(`${d.start_date}T${d.start_time}`, { zone: TZ });
      return [s, s.plus({ minutes: d.duration_minutes })] as const;
    });
    for (const [s, e] of blocks) {
      expect(s > NOW).toBe(true);
      for (const o of occ) expect(s < DateTime.fromISO(o.end) && DateTime.fromISO(o.start) < e).toBe(false);
    }
    expect(blocks[0][1] <= blocks[1][0] || blocks[1][1] <= blocks[0][0]).toBe(true);
  });

  it("a stated time already past today moves to tomorrow", () => {
    const { placed } = planToDrafts({ summary: "", items: [item({ title: "Stretch", start_time: "08:00" })] }, seededData("2026-10-12"), NOW);
    expect(placed[0].draft).toMatchObject({ start_date: "2026-10-15", start_time: "08:00" });
  });

  it("handles trips, recurring items, and refuses incomplete trips", () => {
    const { placed, trip } = planToDrafts({ summary: "", items: [
      item({ type: "trip", title: "Trip to Abuja", destination: "Abuja", date: "2026-10-19", start_time: "09:00", return_date: "2026-10-20", return_time: "18:00" }),
      item({ type: "trip", title: "Trip to Lagos", destination: "Lagos" }),
      item({ title: "Keyboard practice", category_key: "keyboard", start_time: "19:00", duration_minutes: 30, recurrence: { freq: "daily", by_weekday: [] } }),
    ] }, seededData("2026-10-12"), NOW);
    expect(trip?.destination).toBe("Abuja");
    expect(placed[0].draft).toMatchObject({ kind: "trip", duration_minutes: 33 * 60, category_key: "travel" });
    expect(placed[1].placed).toBe("unplaced");
    expect(placed[2].draft?.recurrence).toMatchObject({ freq: "daily" });
  });
});
