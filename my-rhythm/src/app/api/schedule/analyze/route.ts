import { z } from "zod";
import { body, route } from "@/lib/api";
import { ActivityDraftSchema } from "@/lib/schedule/draft";
import { loadScheduleData } from "@/lib/data";
import { proposeDrafts } from "@/lib/proposals";

const Input = z.object({
  drafts: z.array(ActivityDraftSchema).min(1).max(10),
  source: z.enum(["quick_add", "voice", "manual_check", "ai_chat"]).default("quick_add"),
});

/** Analyse new activities against the real calendar and store a proposal for approval. */
export const POST = route(async (req, { supabase, user }) => {
  const input = await body(req, Input);
  const data = await loadScheduleData(supabase, user.id);
  const isTrip = input.drafts[0].kind === "trip";
  const proposal = await proposeDrafts(supabase, user.id, data, input.drafts, input.source,
    isTrip ? { destination: input.drafts[0].location || input.drafts[0].title, prepMinutes: Math.max(30, input.drafts[0].prep_minutes || 60) } : null);
  return { proposal };
});
