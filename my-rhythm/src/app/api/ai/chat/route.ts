import { z } from "zod";
import { body, HttpError, must, route } from "@/lib/api";
import { aiConfigured } from "@/lib/ai/claude";
import { chatTurn, type ChatTurn } from "@/lib/ai/chat";
import { log } from "@/lib/log";

export const maxDuration = 120;

const Input = z.object({ conversationId: z.string().uuid().nullable().optional(), message: z.string().trim().min(1).max(4000) });

export const POST = route(async (req, { supabase, user }) => {
  const { conversationId, message } = await body(req, Input);
  if (!aiConfigured()) throw new HttpError(503, "The AI assistant isn't configured yet (ANTHROPIC_API_KEY). Quick Add still works with the built-in parser.");
  const prefs = await supabase.from("user_preferences").select("ai_enabled").eq("user_id", user.id).maybeSingle();
  if (prefs.data && !prefs.data.ai_enabled) throw new HttpError(403, "AI features are turned off in Settings.");

  let convId = conversationId ?? null;
  if (!convId) {
    const c = must(await supabase.from("ai_conversations").insert({ user_id: user.id, title: message.slice(0, 60) }).select("id").single(), "new conversation") as { id: string };
    convId = c.id;
  }
  const history = (must(
    await supabase.from("ai_messages").select("role,content").eq("conversation_id", convId).order("created_at").limit(40),
    "history",
  ) ?? []) as ChatTurn[];
  await supabase.from("ai_messages").insert({ user_id: user.id, conversation_id: convId, role: "user", content: message });
  let reply: { text: string; proposals: string[] };
  try {
    reply = await chatTurn(supabase, user.id, history, message);
  } catch (e) {
    log.error("ai.chat_failed", { error: e instanceof Error ? e.message : String(e) });
    throw new HttpError(502, "The assistant is unavailable right now. Please try again in a moment.");
  }
  await supabase.from("ai_messages").insert({ user_id: user.id, conversation_id: convId, role: "assistant", content: reply.text, proposal_id: reply.proposals.at(-1) ?? null });
  await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
  return { conversationId: convId, reply: reply.text, proposals: reply.proposals };
});
