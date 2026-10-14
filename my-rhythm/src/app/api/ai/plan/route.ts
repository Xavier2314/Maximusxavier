import { z } from "zod";
import { DateTime } from "luxon";
import { body, route } from "@/lib/api";
import { loadScheduleData } from "@/lib/data";
import { extractPlan } from "@/lib/ai/claude";
import { fallbackPlan, planToDrafts } from "@/lib/ai/tasks";
import { analyzeDrafts } from "@/lib/schedule/analyze";
import { saveProposal } from "@/lib/proposals";

const Input = z.object({ text: z.string().trim().min(2).max(6000), source: z.enum(["ai", "voice"]).default("voice") });

/**
 * "Talk it through": everything you said → a list of tasks/events/reminders/trips
 * with times (yours, or suggested free slots) → one proposal to review & approve.
 */
export const POST = route(async (req, { supabase, user }) => {
  const { text, source } = await body(req, Input);
  const data = await loadScheduleData(supabase, user.id);
  const now = DateTime.now().setZone(data.profile.timezone);
  const { plan, engine } = data.preferences.ai_enabled ? await extractPlan(text, now) : { plan: fallbackPlan(text, now), engine: "fallback" as const };
  const { placed, trip } = planToDrafts(plan, data, now, source);
  const drafts = placed.flatMap((p) => (p.draft ? [p.draft] : []));
  if (!drafts.length) return { summary: plan.summary, items: placed, proposal: null, engine };
  const payload = analyzeDrafts(drafts, data, { now, trip: trip ? { destination: trip.destination, prepMinutes: 60 } : null });
  const proposal = await saveProposal(supabase, user.id, source === "voice" ? "voice" : "quick_add", `Your plan (${drafts.length} item${drafts.length > 1 ? "s" : ""})`, payload, data);
  return { summary: plan.summary, items: placed, proposal, engine };
});
