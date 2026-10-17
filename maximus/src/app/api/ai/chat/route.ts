import Anthropic from "@anthropic-ai/sdk";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { AI_MODEL, SYSTEM_PROMPT, aiClient, buildContextBlock, isAiConfigured } from "@/lib/ai";
import { createClient } from "@/lib/supabase/server";
import { monthStart, todayIn } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({
  conversationId: z.string().uuid().nullable().optional(),
  message: z.string().trim().min(1).max(4000),
});

const HOURLY_LIMIT = 40;

/**
 * Streams a Maximus AI reply as plain text. Every database read uses the
 * member's own session, so RLS guarantees the assistant only ever sees the
 * member's own data plus published approved knowledge.
 */
export async function POST(request: NextRequest) {
  if (!isAiConfigured()) {
    return NextResponse.json({ error: "Maximus AI is not configured yet. An administrator needs to add ANTHROPIC_API_KEY." }, { status: 503 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  const { message } = parsed.data;

  // Simple per-member rate limit.
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await supabase.from("ai_messages").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("role", "user").gte("created_at", since);
  if ((count ?? 0) >= HOURLY_LIMIT) {
    return NextResponse.json({ error: "You've reached the hourly limit for Maximus AI. Please try again a bit later." }, { status: 429 });
  }

  // Conversation (create on first message).
  let conversationId = parsed.data.conversationId ?? null;
  if (conversationId) {
    const { data: conv } = await supabase.from("ai_conversations").select("id").eq("id", conversationId).maybeSingle();
    if (!conv) return NextResponse.json({ error: "Conversation not found" }, { status: 404 });
  } else {
    const { data: conv, error } = await supabase.from("ai_conversations")
      .insert({ user_id: user.id, title: message.slice(0, 80) }).select("id").single();
    if (error || !conv) return NextResponse.json({ error: "Could not start conversation" }, { status: 500 });
    conversationId = conv.id as string;
  }

  const { data: profile } = await supabase.from("profiles").select("full_name, member_id, timezone, ai_memory_enabled").eq("id", user.id).single();
  const today = todayIn(profile?.timezone ?? "Africa/Lagos");
  const [{ data: history }, { data: roles }, { data: streak }, { data: goal }, { data: evals }, { data: memories }, { data: knowledge }] = await Promise.all([
    supabase.from("ai_messages").select("role, content").eq("conversation_id", conversationId).order("created_at", { ascending: false }).limit(20),
    supabase.from("user_roles").select("roles(name)").eq("user_id", user.id),
    supabase.rpc("attendance_streak"),
    supabase.from("monthly_goals").select("id, income_target, sales_target, prospecting_target, recruitment_target, order_target, savings_target, personal_development_target, status")
      .eq("user_id", user.id).eq("month", monthStart(today)).maybeSingle(),
    supabase.from("evaluations").select("period_date, earnings, prospects, presentations, follow_ups, orders_generated, new_joins, challenges, priorities")
      .eq("user_id", user.id).order("period_date", { ascending: false }).limit(3),
    profile?.ai_memory_enabled ? supabase.from("ai_memories").select("content").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20) : Promise.resolve({ data: [] }),
    supabase.rpc("search_knowledge", { p_query: message, p_limit: 5 }),
  ]);
  const progress = goal ? (await supabase.rpc("goal_progress", { p_goal: goal.id })).data : null;

  const context = buildContextBlock({
    firstName: (profile?.full_name ?? "Member").split(" ")[0],
    memberId: profile?.member_id ?? "",
    roles: ((roles ?? []) as unknown as { roles: { name: string } | null }[]).map((r) => r.roles?.name).filter(Boolean) as string[],
    today,
    streak: (streak as number | null) ?? null,
    goal: goal ? { ...goal, id: undefined } : null,
    progress: progress as Record<string, unknown> | null,
    recentEvaluations: (evals ?? []) as Record<string, unknown>[],
    memories: ((memories ?? []) as { content: string }[]).map((m) => m.content),
  }, ((knowledge ?? []) as { title: string; content: string }[]));

  // Save the member's message before calling the model.
  await supabase.from("ai_messages").insert({ conversation_id: conversationId, user_id: user.id, role: "user", content: message });

  const past: Anthropic.MessageParam[] = [...(history ?? [])].reverse()
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content as string }));
  const messages: Anthropic.MessageParam[] = [
    ...past,
    { role: "user", content: [{ type: "text", text: context }, { type: "text", text: message }] },
  ];

  const encoder = new TextEncoder();
  const convId = conversationId;
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = "";
      try {
        const s = aiClient().beta.messages.stream({
          model: AI_MODEL,
          max_tokens: 4000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium" },
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: messages as Anthropic.Beta.BetaMessageParam[],
        });
        for await (const event of s) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            full += event.delta.text;
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }
        const final = await s.finalMessage();
        if (final.stop_reason === "refusal") {
          const note = full ? "\n\n(I had to stop there.)" : "I'm not able to help with that request. Try asking about prospecting, sales, leadership or your goals.";
          full += note;
          controller.enqueue(encoder.encode(note));
        } else if (final.stop_reason === "max_tokens") {
          const note = "\n\n(Reply cut short — ask me to continue.)";
          full += note;
          controller.enqueue(encoder.encode(note));
        }
      } catch (err) {
        const msg = err instanceof Anthropic.RateLimitError
          ? "Maximus AI is busy right now. Please try again in a minute."
          : err instanceof Anthropic.APIError && err.status && err.status >= 500
            ? "Maximus AI is temporarily unavailable. Please try again shortly."
            : "Sorry, something went wrong generating a reply.";
        full = full ? `${full}\n\n(${msg})` : msg;
        controller.enqueue(encoder.encode(full === msg ? msg : `\n\n(${msg})`));
      } finally {
        if (full) {
          await supabase.from("ai_messages").insert({ conversation_id: convId, user_id: user.id, role: "assistant", content: full.slice(0, 20000) });
          await supabase.from("ai_conversations").update({ updated_at: new Date().toISOString() }).eq("id", convId);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Conversation-Id": convId },
  });
}
