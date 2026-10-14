import { route, must } from "@/lib/api";

export const GET = route(async (_req, { supabase, user }) => {
  return {
    proposals: must(
      await supabase.from("schedule_proposals").select("id,title,summary,status,source,created_at,decided_at").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
      "list proposals",
    ),
  };
});
