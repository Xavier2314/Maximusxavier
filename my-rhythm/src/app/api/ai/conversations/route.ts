import { route, must } from "@/lib/api";

export const GET = route(async (req, { supabase, user }) => {
  const id = new URL(req.url).searchParams.get("id");
  if (id) {
    return { messages: must(await supabase.from("ai_messages").select("id,role,content,proposal_id,created_at").eq("conversation_id", id).order("created_at"), "messages") };
  }
  return { conversations: must(await supabase.from("ai_conversations").select("id,title,updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(30), "conversations") };
});

export const DELETE = route(async (req, { supabase, user }) => {
  const id = new URL(req.url).searchParams.get("id");
  const q = supabase.from("ai_conversations").delete().eq("user_id", user.id);
  must(id ? await q.eq("id", id) : await q, "delete conversations");
  return { ok: true };
});
