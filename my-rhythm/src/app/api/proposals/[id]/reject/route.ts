import { route, must } from "@/lib/api";

export const POST = route<{ id: string }>(async (_req, { supabase }, { id }) => {
  must(await supabase.from("schedule_proposals").update({ status: "rejected", decided_at: new Date().toISOString() }).eq("id", id).eq("status", "pending"), "reject");
  await supabase.from("trips").update({ status: "cancelled" }).eq("proposal_id", id).eq("status", "draft");
  return { ok: true };
});
