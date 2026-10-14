import { route, must } from "@/lib/api";

/** All active activities (routine editor, settings). */
export const GET = route(async (req, { supabase, user }) => {
  const url = new URL(req.url);
  const q = supabase.from("activities").select("*, reminder_rules(*)").eq("user_id", user.id).eq("status", "active").order("start_time");
  if (url.searchParams.get("recurring") === "1") q.not("recurrence", "is", null);
  return { activities: must(await q, "list activities") };
});
