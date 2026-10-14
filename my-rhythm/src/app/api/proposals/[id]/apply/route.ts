import { z } from "zod";
import { body, HttpError, must, route } from "@/lib/api";
import { applyProposal } from "@/lib/schedule/apply";
import { loadScheduleData } from "@/lib/data";
import { syncAfterChange } from "@/lib/reminders/sync";
import { ActivityDraftSchema } from "@/lib/schedule/draft";
import type { ProposalPayload } from "@/lib/schedule/analyze";

const Input = z.object({
  selected: z.array(z.string()).max(200),
  overrides: z.record(z.string(), z.object({ draft: ActivityDraftSchema.optional(), newStart: z.string().optional(), newEnd: z.string().optional() })).optional(),
});

/** Apply ONLY the approved recommendations. */
export const POST = route<{ id: string }>(async (req, { supabase, user }, { id }) => {
  const input = await body(req, Input);
  const p = must(await supabase.from("schedule_proposals").select("*").eq("id", id).maybeSingle(), "load proposal") as
    | { id: string; status: string; payload: ProposalPayload; source: string }
    | null;
  if (!p) throw new HttpError(404, "Proposal not found");
  if (p.status !== "pending") throw new HttpError(409, `This proposal was already ${p.status}.`);
  const data = await loadScheduleData(supabase, user.id);
  const result = await applyProposal(supabase, user.id, p.id, p.payload, input.selected, data, input.overrides ?? {});
  const actionable = p.payload.recommendations.filter((r) => r.action !== "note").length;
  const status = !result.applied.length ? (result.failed.length ? "pending" : "rejected") : result.applied.length >= actionable ? "approved" : "partially_approved";
  if (status !== "pending") await supabase.from("schedule_proposals").update({ status, decided_at: new Date().toISOString() }).eq("id", p.id);
  // activate the trip record when its activity was approved
  if (p.payload.trip?.tripId && result.applied.length) {
    const tripRec = p.payload.recommendations.find((r) => r.draft?.kind === "trip");
    if (tripRec && result.applied.includes(tripRec.id)) {
      const { data: act } = await supabase.from("activities").select("id").eq("trip_id", p.payload.trip.tripId).eq("kind", "trip").eq("status", "active").maybeSingle();
      await supabase.from("trips").update({ status: "planned", activity_id: act?.id ?? null }).eq("id", p.payload.trip.tripId);
    }
  }
  await syncAfterChange(supabase, user.id);
  return { ...result, status };
});
