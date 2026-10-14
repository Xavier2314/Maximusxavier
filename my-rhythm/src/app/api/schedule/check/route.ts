import { z } from "zod";
import { DateTime } from "luxon";
import { body, route } from "@/lib/api";
import { loadScheduleData } from "@/lib/data";
import { detectConflicts } from "@/lib/schedule/conflicts";
import { expandOccurrences } from "@/lib/schedule/occurrences";

const Input = z.object({
  title: z.string().max(200),
  start: z.string(),
  end: z.string(),
  replaces: z.array(z.string()).optional(),
});

/** Quick conflict check (used when dragging an event to a new time). */
export const POST = route(async (req, { supabase, user }) => {
  const c = await body(req, Input);
  const data = await loadScheduleData(supabase, user.id);
  const tz = data.profile.timezone;
  const s = DateTime.fromISO(c.start);
  const e = DateTime.fromISO(c.end);
  const existing = expandOccurrences(data.activities, data.exceptions, s.minus({ days: 1 }), e.plus({ days: 1 }), tz);
  return { conflicts: detectConflicts([c], { existing, profile: data.profile, preferences: data.preferences, tz }) };
});
