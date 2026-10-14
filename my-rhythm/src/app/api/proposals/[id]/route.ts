import { route, must, HttpError } from "@/lib/api";
import { computeProposed, type ProposalPayload } from "@/lib/schedule/analyze";

export const GET = route<{ id: string }>(async (_req, { supabase }, { id }) => {
  const p = must(await supabase.from("schedule_proposals").select("*").eq("id", id).maybeSingle(), "load proposal") as { payload: ProposalPayload } | null;
  if (!p) throw new HttpError(404, "Proposal not found");
  const selected = new Set(p.payload.recommendations.filter((r) => r.selected).map((r) => r.id));
  return { proposal: p, proposed: computeProposed(p.payload, selected) };
});
