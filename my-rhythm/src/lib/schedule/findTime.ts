import { DateTime } from "luxon";
import type { ScheduleData } from "../types";
import { expandOccurrences } from "./occurrences";
import { findFreeSlots, type PartOfDay } from "./freeSlots";
import type { ProposalPayload, Recommendation } from "./analyze";
import { ActivityDraftSchema } from "./draft";
import { fmtTime } from "../time";

export interface FindTimeRequest {
  title: string;
  categoryKey: string;
  durationMinutes: number;
  fromDate: string;
  toDate: string;
  partOfDay?: PartOfDay;
}

/** Build a proposal offering alternative free slots (pick one). Nothing is booked until approved. */
export function findTimeProposal(req: FindTimeRequest, data: ScheduleData, now = DateTime.now()): ProposalPayload {
  const tz = data.profile.timezone;
  const from = DateTime.max(DateTime.fromISO(req.fromDate, { zone: tz }), now.setZone(tz).startOf("day"));
  const to = DateTime.fromISO(req.toDate, { zone: tz }).endOf("day");
  const occ = expandOccurrences(data.activities, data.exceptions, from, to, tz);
  const focusy = ["keyboard", "podcast", "office"].includes(req.categoryKey);
  const slots = findFreeSlots({
    occurrences: occ, fromDate: from.toISODate()!, toDate: to.toISODate()!, tz, durationMinutes: req.durationMinutes,
    profile: data.profile, preferences: data.preferences, partOfDay: req.partOfDay ?? "any", notBefore: now,
    preferFocusHours: focusy, maxResults: 4,
  });
  const recs: Recommendation[] = slots.map((s, i) => {
    const st = DateTime.fromISO(s.start).setZone(tz);
    return {
      id: `r${i + 1}`,
      action: "create_activity",
      selected: i === 0,
      choiceGroup: "slot",
      title: `${st.toFormat("cccc d LLL")}, ${fmtTime(s.start, tz)}–${fmtTime(s.end, tz)}`,
      reason: s.reasons.length ? `Free time — ${s.reasons.join(", ")}.` : "Free time that respects your sleep, rest and buffers.",
      draft: ActivityDraftSchema.parse({
        title: req.title, category_key: req.categoryKey, kind: "block", start_date: st.toISODate(), start_time: st.toFormat("HH:mm"),
        duration_minutes: req.durationMinutes, classification: "flexible", priority: 4, source: "ai",
      }),
    };
  });
  if (!recs.length) {
    recs.push({
      id: "r1", action: "note", selected: false,
      title: `I couldn't find ${req.durationMinutes} free minutes between ${from.toFormat("ccc d LLL")} and ${to.toFormat("ccc d LLL")}.`,
      reason: "Try a longer range, a shorter session, or splitting it into two blocks.",
    });
  }
  return { version: 1, generatedAt: now.toISO()!, timezone: tz, drafts: [], original: [], conflicts: [], recommendations: recs, trip: null };
}
