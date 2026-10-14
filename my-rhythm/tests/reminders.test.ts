import { describe, expect, it } from "vitest";
import { DateTime } from "luxon";
import { planReminders, type ScheduledReminder } from "@/lib/reminders/planner";
import { seededData } from "./helpers";

const TZ = "Africa/Lagos";
const at = (s: string) => DateTime.fromISO(s, { zone: TZ });

/** Simulate the database: apply plan results to an in-memory table. */
function applyPlan(table: (ScheduledReminder & { id: string })[], plan: ReturnType<typeof planReminders>) {
  for (const ins of plan.inserts) {
    if (table.some((t) => t.dedupe_key === ins.dedupe_key)) throw new Error("duplicate dedupe key " + ins.dedupe_key);
    table.push({ ...ins, id: `id${table.length + 1}` });
  }
  for (const u of plan.updates) Object.assign(table.find((t) => t.id === u.id)!, u.patch);
  return table;
}

const local = (r: { fire_at: string }) => DateTime.fromISO(r.fire_at).setZone(TZ).toFormat("ccc HH:mm");

describe("reminder planner", () => {
  it("creates the exact devotion, gym, keyboard, office and bedtime reminders in Africa/Lagos time", () => {
    const data = seededData("2026-10-19");
    const plan = planReminders({ data, rules: data.rules, existing: [], now: at("2026-10-19T00:00"), horizonHours: 24 });
    const byBody = (b: string) => plan.inserts.filter((r) => r.body === b).map(local);

    expect(byBody("Your time with God begins in five minutes.")).toEqual(["Mon 04:55"]);
    expect(byBody("Good morning! It's time for Bible study and prayer.")).toEqual(["Mon 05:00"]);
    expect(byBody("Have you completed your devotion? Record today's reflection.")).toEqual(["Mon 06:00"]);
    expect(byBody("Get ready for the gym.")).toEqual(["Mon 06:15"]);
    expect(byBody("Time to leave for the gym.")).toEqual(["Mon 06:30"]);
    expect(byBody("Your workout begins now.")).toEqual(["Mon 07:00"]);
    expect(byBody("Great work! Time to return home and recover.")).toEqual(["Mon 08:00"]);
    expect(byBody("Your keyboard lesson starts in 30 minutes.")).toEqual(["Mon 09:30"]);
    expect(byBody("Keyboard practice starts in 10 minutes.")).toEqual(["Mon 12:50"]);
    expect(byBody("Office training starts in 30 minutes.")).toEqual(["Mon 15:30"]);
    expect(byBody("Time for office training.")).toEqual(["Mon 16:00"]);
    expect(byBody("Start winding down for bed.")).toEqual(["Mon 20:30"]);
    expect(byBody("Time to rest and prepare for tomorrow.")).toEqual(["Mon 21:00"]);
    expect(plan.inserts.find((r) => r.kind === "agenda")).toMatchObject({ dedupe_key: "agenda:2026-10-19" });
    // 4:55 AM in Lagos (UTC+1) is 03:55 UTC
    expect(plan.inserts.find((r) => r.body.startsWith("Your time with God"))!.fire_at).toBe("2026-10-19T03:55:00.000Z");
  });

  it("daily agenda summarises the real day", () => {
    const data = seededData("2026-10-19");
    const plan = planReminders({ data, rules: data.rules, existing: [], now: at("2026-10-19T00:00"), horizonHours: 24 });
    expect(plan.inserts.find((r) => r.kind === "agenda")!.body).toBe(
      "Here is your schedule today: Bible study at 5 AM, Gym workout at 7 AM, Keyboard lesson at 10 AM, Keyboard practice at 1 PM, Office training at 4 PM.",
    );
  });

  it("is idempotent — running the scheduler again creates no duplicates", () => {
    const data = seededData("2026-10-19");
    const table: (ScheduledReminder & { id: string })[] = [];
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00") }));
    const n = table.length;
    const again = planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00") });
    expect(again.inserts).toHaveLength(0);
    expect(again.updates).toHaveLength(0);
    // a minute later: still nothing new for the already-planned window
    const later = planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:01") });
    applyPlan(table, later);
    expect(new Set(table.map((t) => t.dedupe_key)).size).toBe(table.length);
    expect(table.length).toBeGreaterThanOrEqual(n);
  });

  it("updates reminders when an activity is rescheduled", () => {
    const data = seededData("2026-10-19");
    const table: (ScheduledReminder & { id: string })[] = [];
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00"), horizonHours: 24 }));
    const office = data.activities.find((a) => a.title === "Office training")!;
    data.exceptions.push({ id: "e", activity_id: office.id, occurrence_date: "2026-10-19", kind: "modified",
      start_at: "2026-10-19T17:00:00+01:00", end_at: "2026-10-19T20:00:00+01:00", title: null, note: null });
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00"), horizonHours: 24 }));
    const officeRem = table.filter((t) => t.activity_id === office.id && t.status === "pending").map(local).sort();
    expect(officeRem).toEqual(["Mon 16:30", "Mon 17:00", "Mon 20:00"]);
  });

  it("cancelled events no longer create reminders", () => {
    const data = seededData("2026-10-19");
    const table: (ScheduledReminder & { id: string })[] = [];
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00"), horizonHours: 24 }));
    const lesson = data.activities.find((a) => a.dedupe_key === "seed:keyboard-lesson-mon")!;
    data.exceptions.push({ id: "e", activity_id: lesson.id, occurrence_date: "2026-10-19", kind: "cancelled", start_at: null, end_at: null, title: null, note: null });
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00"), horizonHours: 24 }));
    expect(table.filter((t) => t.activity_id === lesson.id).every((t) => t.status === "cancelled")).toBe(true);
    // and cancelling the whole series does the same
    const gym = data.activities.find((a) => a.title === "Gym workout")!;
    gym.status = "cancelled";
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00"), horizonHours: 24 }));
    expect(table.filter((t) => t.activity_id === gym.id).every((t) => t.status === "cancelled")).toBe(true);
  });

  it("completed activities suppress follow-up reminders", () => {
    const data = seededData("2026-10-19");
    const table: (ScheduledReminder & { id: string })[] = [];
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00"), horizonHours: 24 }));
    const dev = data.activities.find((a) => a.group_key === "devotion")!;
    data.completions.push({ id: "c", activity_id: dev.id, occurrence_date: "2026-10-19", status: "completed",
      started_at: null, completed_at: "2026-10-19T05:50:00+01:00", duration_minutes: 50, notes: null });
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T05:50"), horizonHours: 24 }));
    const end = table.find((t) => t.activity_id === dev.id && t.body.startsWith("Have you completed"))!;
    expect(end.status).toBe("suppressed");
  });

  it("disabling a category or all notifications cancels pending reminders", () => {
    const data = seededData("2026-10-19");
    const table: (ScheduledReminder & { id: string })[] = [];
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00"), horizonHours: 24 }));
    data.categories.find((c) => c.key === "podcast")!.notify = false;
    data.preferences = { ...data.preferences, bedtime_reminders_enabled: false };
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00"), horizonHours: 48 }));
    expect(table.filter((t) => t.kind === "bedtime" && t.status === "pending")).toHaveLength(0);
    data.preferences = { ...data.preferences, notifications_enabled: false };
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00"), horizonHours: 48 }));
    expect(table.filter((t) => t.status === "pending")).toHaveLength(0);
  });

  it("re-arms an already-sent reminder only if the activity moved to a new future time", () => {
    const data = seededData("2026-10-19");
    const table: (ScheduledReminder & { id: string })[] = [];
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T00:00"), horizonHours: 24 }));
    const r = table.find((t) => t.body === "Office training starts in 30 minutes.")!;
    r.status = "sent";
    // nothing changes → stays sent
    applyPlan(table, planReminders({ data, rules: data.rules, existing: table, now: at("2026-10-19T15:31"), horizonHours: 24 }));
    expect(r.status).toBe("sent");
  });

  it("Sunday weekly review reminder fires at 4:00 PM", () => {
    const data = seededData("2026-10-19");
    const plan = planReminders({ data, rules: data.rules, existing: [], now: at("2026-10-25T00:00"), horizonHours: 24 });
    expect(plan.inserts.filter((r) => r.body.startsWith("Time to review your week")).map(local)).toEqual(["Sun 16:00"]);
  });
});
