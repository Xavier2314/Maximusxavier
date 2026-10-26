import { route, must } from "@/lib/api";

export const GET = route(async (_req, { supabase, user }) => ({
  history: must(
    await supabase.from("schedule_change_history").select("id,batch_id,proposal_id,entity,action,description,undone_at,created_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(200),
    "history",
  ),
}));
