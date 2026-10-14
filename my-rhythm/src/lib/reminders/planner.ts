import { DateTime } from "luxon";
import type { CompletionRow, Occurrence, ReminderRuleRow, ScheduleData } from "../types";
import { expandOccurrences } from "../schedule/occurrences";
import { fmtTime, fmtTimeShort, timeToMinutes, zonedDateTime } from "../time";

export type ReminderKind = "activity" | "snooze" | "winddown" | "bedtime" | "agenda" | "test" | "custom";
export type ReminderStatus = "pending" | "sending" | "sent" | "failed" | "cancelled" | "suppressed" | "expired";

export interface ScheduledReminder {
  id?: string;
  activity_id: string | null;
  occurrence_date: string | null;
  rule_id: string | null;
  kind: ReminderKind;
  fire_at: string;
  title: string;
  body: string;
  url: string;
  status: ReminderStatus;
  dedupe_key: string;
}

export const PLANNED_KINDS: ReminderKind[] = ["activity", "winddown", "bedtime", "agenda"];

export interface PlanInput {
  data: ScheduleData;
  rules: ReminderRuleRow[];
  existing: (ScheduledReminder & { id: string })[];
  now: DateTime;
  horizonHours?: number;
}

export interface PlanResult {
  inserts: ScheduledReminder[];
  updates: { id: string; patch: Partial<ScheduledReminder> }[];
}

function defaultMessage(rule: Pick<ReminderRuleRow, "anchor" | "offset_minutes">, o: Occurrence): string {
  const t = o.title;
  if (rule.anchor === "end") {
    if (rule.offset_minutes === 0) return `${t} is finishing now.`;
    return rule.offset_minutes < 0 ? `${t} ends in ${-rule.offset_minutes} minutes.` : `${t} ended ${rule.offset_minutes} minutes ago.`;
  }
  if (rule.offset_minutes === 0) return `It's time for ${t}.`;
  if (rule.offset_minutes < 0) {
    const m = -rule.offset_minutes;
    const when = m >= 1440 && m % 1440 === 0 ? `${m / 1440} day${m > 1440 ? "s" : ""}` : m >= 60 && m % 60 === 0 ? `${m / 60} hour${m > 60 ? "s" : ""}` : `${m} minutes`;
    return `${t} starts in ${when}.`;
  }
  return `${t} started ${rule.offset_minutes} minutes ago.`;
}

/** Short agenda line: “Bible study at 5 AM, gym at 7 AM, …” */
export function agendaSummary(occ: Occurrence[], tz: string): string {
  const visible = occ.filter(
    (o) => o.status !== "cancelled" && !(o.groupKey === "gym-morning" && !/workout/i.test(o.title)),
  );
  if (!visible.length) return "Your day is open. Enjoy the space and rest well.";
  const parts = visible.slice(0, 6).map((o) => `${o.title.replace(/ & .*$/, "")} at ${o.allDay ? "all day" : fmtTimeShort(o.start, tz)}`);
  const more = visible.length > 6 ? `, +${visible.length - 6} more` : "";
  return `Here is your schedule today: ${parts.join(", ")}${more}.`;
}

/**
 * Compute the reminders that SHOULD exist in the planning horizon and diff them
 * against what is stored. The diff is idempotent: running it twice produces no
 * further changes, and reminders already sent are never re-sent unless the
 * underlying activity was rescheduled to a new future time.
 */
export function planReminders({ data, rules, existing, now, horizonHours = 48 }: PlanInput): PlanResult {
  const tz = data.profile.timezone;
  const prefs = data.preferences;
  const horizonEnd = now.plus({ hours: horizonHours });
  const floor = now.minus({ minutes: 1 });
  const desired = new Map<string, ScheduledReminder>();
  const suppressed = new Set<string>();

  const completionByKey = new Map<string, CompletionRow>();
  for (const c of data.completions) completionByKey.set(`${c.activity_id}:${c.occurrence_date}`, c);
  const catById = new Map(data.categories.map((c) => [c.id, c]));
  const rulesByActivity = new Map<string, ReminderRuleRow[]>();
  for (const r of rules) {
    if (!r.enabled) continue;
    const list = rulesByActivity.get(r.activity_id) ?? [];
    list.push(r);
    rulesByActivity.set(r.activity_id, list);
  }

  if (prefs.notifications_enabled) {
    const maxLead = Math.max(0, ...rules.map((r) => -r.offset_minutes));
    const occ = expandOccurrences(
      data.activities,
      data.exceptions,
      now.minus({ days: 1 }),
      horizonEnd.plus({ minutes: maxLead }),
      tz,
    );
    for (const o of occ) {
      if (o.status === "cancelled") continue;
      const cat = o.categoryId ? catById.get(o.categoryId) : undefined;
      if (cat && !cat.notify) continue;
      const completion = completionByKey.get(o.key);
      for (const rule of rulesByActivity.get(o.activityId) ?? []) {
        const anchor = DateTime.fromISO(rule.anchor === "end" ? o.end : o.start);
        const fire = anchor.plus({ minutes: rule.offset_minutes });
        if (fire <= floor || fire > horizonEnd) continue;
        const key = `a:${o.activityId}:${o.occurrenceDate}:${rule.id}`;
        if (completion && (completion.status !== "in_progress" || rule.anchor === "start")) {
          suppressed.add(key);
          continue;
        }
        const when = o.allDay ? "All day" : `${fmtTime(o.start, tz)} – ${fmtTime(o.end, tz)}`;
        desired.set(key, {
          activity_id: o.activityId,
          occurrence_date: o.occurrenceDate,
          rule_id: rule.id,
          kind: "activity",
          fire_at: fire.toUTC().toISO()!,
          title: `${o.title} · ${when}`,
          body: rule.message || defaultMessage(rule, o),
          url: `/?focus=${encodeURIComponent(o.key)}`,
          status: "pending",
          dedupe_key: key,
        });
      }
    }

    // Bedtime + daily agenda, per local day in the horizon.
    let day = now.setZone(tz).startOf("day");
    while (day <= horizonEnd) {
      const date = day.toISODate()!;
      if (prefs.bedtime_reminders_enabled) {
        const bed = zonedDateTime(date, data.profile.bedtime, tz);
        const bedAt = timeToMinutes(data.profile.bedtime) < timeToMinutes(data.profile.wake_time) ? bed.plus({ days: 1 }) : bed;
        const items: [string, DateTime, string, ReminderKind][] = [
          [`bed:${date}:winddown`, bedAt.minus({ minutes: prefs.wind_down_minutes }), "Start winding down for bed.", "winddown"],
          [`bed:${date}:bedtime`, bedAt, "Time to rest and prepare for tomorrow.", "bedtime"],
        ];
        for (const [key, at, body, kind] of items) {
          if (prefs.wind_down_minutes === 0 && kind === "winddown") continue;
          if (at <= floor || at > horizonEnd) continue;
          desired.set(key, {
            activity_id: null, occurrence_date: date, rule_id: null, kind, fire_at: at.toUTC().toISO()!,
            title: kind === "winddown" ? `Wind down · ${fmtTime(at, tz)}` : `Bedtime · ${fmtTime(at, tz)}`,
            body, url: "/", status: "pending", dedupe_key: key,
          });
        }
      }
      if (prefs.daily_agenda_enabled) {
        const at = zonedDateTime(date, prefs.daily_agenda_time, tz);
        if (at > floor && at <= horizonEnd) {
          const dayOcc = expandOccurrences(data.activities, data.exceptions, day, day.plus({ days: 1 }), tz).filter(
            (o) => DateTime.fromISO(o.start).setZone(tz).toISODate() === date,
          );
          desired.set(`agenda:${date}`, {
            activity_id: null, occurrence_date: date, rule_id: null, kind: "agenda", fire_at: at.toUTC().toISO()!,
            title: `Good morning — your ${day.toFormat("cccc")}`,
            body: agendaSummary(dayOcc, tz),
            url: `/calendar?view=day&date=${date}`, status: "pending", dedupe_key: `agenda:${date}`,
          });
        }
      }
      day = day.plus({ days: 1 });
    }
  }

  const inserts: ScheduledReminder[] = [];
  const updates: PlanResult["updates"] = [];
  const byKey = new Map(existing.map((e) => [e.dedupe_key, e]));

  for (const [key, d] of desired) {
    const e = byKey.get(key);
    if (!e) {
      inserts.push(d);
      continue;
    }
    const sameTime = DateTime.fromISO(e.fire_at).toMillis() === DateTime.fromISO(d.fire_at).toMillis();
    if (e.status === "pending") {
      if (!sameTime || e.title !== d.title || e.body !== d.body || e.url !== d.url) {
        updates.push({ id: e.id, patch: { fire_at: d.fire_at, title: d.title, body: d.body, url: d.url } });
      }
    } else if (e.status === "cancelled" || e.status === "suppressed") {
      // e.g. a cancellation was undone, or a completion was reverted
      updates.push({ id: e.id, patch: { status: "pending", fire_at: d.fire_at, title: d.title, body: d.body, url: d.url } });
    } else if (!sameTime && e.status !== "sending") {
      // already delivered for the old time, but the activity moved to a new future time
      updates.push({ id: e.id, patch: { status: "pending", fire_at: d.fire_at, title: d.title, body: d.body, url: d.url } });
    }
  }

  for (const e of existing) {
    if (e.status !== "pending" || !PLANNED_KINDS.includes(e.kind)) continue;
    if (desired.has(e.dedupe_key)) continue;
    if (DateTime.fromISO(e.fire_at) <= floor) continue; // the dispatcher owns overdue rows
    updates.push({ id: e.id, patch: { status: suppressed.has(e.dedupe_key) ? "suppressed" : "cancelled" } });
  }

  return { inserts, updates };
}
