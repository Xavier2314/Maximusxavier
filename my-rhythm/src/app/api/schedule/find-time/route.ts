import { z } from "zod";
import { body, route } from "@/lib/api";
import { loadScheduleData } from "@/lib/data";
import { proposeFindTime } from "@/lib/proposals";

const Input = z.object({
  title: z.string().trim().min(1).max(200),
  category_key: z.string().default("personal"),
  duration_minutes: z.number().int().min(5).max(720),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  part_of_day: z.enum(["morning", "afternoon", "evening", "any"]).default("any"),
});

/** Deterministic "find time for X" → proposal with alternative slots (pick one, approve). */
export const POST = route(async (req, { supabase, user }) => {
  const i = await body(req, Input);
  const data = await loadScheduleData(supabase, user.id);
  const proposal = await proposeFindTime(supabase, user.id, data, {
    title: i.title, categoryKey: i.category_key, durationMinutes: i.duration_minutes, fromDate: i.from, toDate: i.to, partOfDay: i.part_of_day,
  });
  return { proposal };
});
