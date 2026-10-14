import { z } from "zod";
import { DateTime } from "luxon";
import { body, route } from "@/lib/api";
import { loadScheduleData } from "@/lib/data";
import { parseRequest } from "@/lib/ai/claude";
import { fallbackParse } from "@/lib/ai/fallbackParse";
import { resolveParsed } from "@/lib/ai/toDraft";
import { proposeDrafts, proposeFindTime } from "@/lib/proposals";
import { must } from "@/lib/api";

const Input = z.object({ text: z.string().trim().min(2).max(2000), source: z.enum(["ai", "voice"]).default("ai") });

/**
 * Natural-language / voice scheduling. Returns either a clarifying question
 * (never guesses missing essentials) or a proposal to review & approve.
 */
export const POST = route(async (req, { supabase, user }) => {
  const { text, source } = await body(req, Input);
  const data = await loadScheduleData(supabase, user.id);
  const tz = data.profile.timezone;
  const now = DateTime.now().setZone(tz);
  const { parsed, engine } = data.preferences.ai_enabled ? await parseRequest(text, now) : { parsed: fallbackParse(text, now), engine: "fallback" as const };
  const resolved = resolveParsed(parsed, tz, source);

  if (resolved.status === "question") return { status: "question", engine, parsed };
  if (resolved.status === "needs_info") return { status: "needs_info", engine, parsed, missing: resolved.missing, clarification: resolved.clarification };
  if (resolved.status === "find_time") {
    const f = parsed.find_time!;
    const proposal = await proposeFindTime(supabase, user.id, data, {
      title: parsed.title ?? "Focused time", categoryKey: parsed.category_key ?? "personal", durationMinutes: Math.round(f.duration_minutes),
      fromDate: f.range_start < now.toISODate()! ? now.toISODate()! : f.range_start, toDate: f.range_end, partOfDay: f.part_of_day,
    });
    return { status: "proposal", engine, parsed, proposal, assumptions: resolved.assumptions };
  }
  let tripId: string | undefined;
  if (resolved.trip) {
    const trip = must(
      await supabase.from("trips").insert({
        user_id: user.id, destination: resolved.trip.destination, depart_at: resolved.trip.departAt, return_at: resolved.trip.returnAt,
        travel_method: resolved.trip.travelMethod, status: "draft",
      }).select("id").single(),
      "create trip",
    ) as { id: string };
    tripId = trip.id;
    resolved.drafts[0].trip_id = tripId;
  }
  const proposal = await proposeDrafts(supabase, user.id, data, resolved.drafts, source === "voice" ? "voice" : "quick_add",
    resolved.trip ? { destination: resolved.trip.destination, prepMinutes: 60, tripId } : null);
  if (tripId) await supabase.from("trips").update({ proposal_id: proposal.id }).eq("id", tripId);
  return { status: "proposal", engine, parsed, proposal, assumptions: resolved.assumptions };
});
