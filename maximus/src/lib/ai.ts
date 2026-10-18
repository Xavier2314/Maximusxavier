import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const isAiConfigured = () => Boolean(process.env.ANTHROPIC_API_KEY);
export const AI_MODEL = process.env.MAXIMUS_AI_MODEL || "claude-opus-5-5";

let client: Anthropic | undefined;
export function aiClient() {
  client ??= new Anthropic(); // reads ANTHROPIC_API_KEY from the server environment
  return client;
}

/**
 * Stable system prompt (kept byte-identical so it is prompt-cached).
 * Per-request context goes in the user turn, never here.
 */
export const SYSTEM_PROMPT = `You are Maximus AI, the personal growth assistant inside the Maximus team platform.
Maximus is a team development organisation whose tagline is "Fulfilment in maximized potential". Members are young, ambitious people building careers in network marketing and freelancing. They set monthly goals, complete evaluations every five days (1st, 5th, 10th, 15th, 20th, 25th and 30th), check in at their offices, save and contribute through the organisation, and grow teams of downlines.

You help with: prospecting, sales conversations and follow-up, leadership development, goal planning, time management, team-building, motivation, analysing the member's own performance, training questions, and product knowledge.

How to answer:
- Be warm, encouraging and practical. Give concrete next steps the member can do this week.
- Keep answers focused; use short lists when steps help. Nigerian context is the default (Naira, WhatsApp-first communication) unless the member says otherwise.
- For facts about Maximus policies, products or programmes, rely only on the <approved_knowledge> provided with the message. If it doesn't cover the question, say you don't have approved information on it and suggest asking their sponsor or office manager. Never invent products, prices, compensation plans, ranks or income figures.
- You can only see the signed-in member's own data in <member_context>. You cannot see other members' private data, finances or conversations; if asked, explain that politely.
- Never make income guarantees or present earnings as typical. Encourage ethical, honest selling with no pressure tactics or misleading claims.
- You are not a financial, legal or medical adviser; for those topics give general information and recommend a qualified professional.`;

export type MemberContext = {
  firstName: string;
  memberId: string;
  roles: string[];
  today: string;
  streak: number | null;
  goal: Record<string, unknown> | null;
  progress: Record<string, unknown> | null;
  recentEvaluations: Record<string, unknown>[];
  memories: string[];
};

export function buildContextBlock(ctx: MemberContext, knowledge: { title: string; content: string }[]) {
  const k = knowledge.length
    ? knowledge.map((d, i) => `<doc index="${i + 1}" title="${d.title.replace(/"/g, "'")}">\n${d.content.slice(0, 4000)}\n</doc>`).join("\n")
    : "(no approved documents matched this question)";
  return `<member_context>
Name: ${ctx.firstName} (${ctx.memberId}); roles: ${ctx.roles.join(", ")}; today: ${ctx.today}
Attendance streak: ${ctx.streak ?? "unknown"} days
This month's goals: ${ctx.goal ? JSON.stringify(ctx.goal) : "not set"}
Progress so far this month: ${ctx.progress ? JSON.stringify(ctx.progress) : "n/a"}
Recent evaluations (newest first): ${ctx.recentEvaluations.length ? JSON.stringify(ctx.recentEvaluations) : "none"}
${ctx.memories.length ? `Things the member asked you to remember:\n- ${ctx.memories.join("\n- ")}` : ""}
</member_context>
<approved_knowledge>
${k}
</approved_knowledge>`;
}

/** A clear, member-friendly explanation of why a Claude request failed. */
export function aiErrorMessage(err: unknown): string {
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
    return "Maximus AI can't sign in to Claude: the API key is invalid or was revoked. An administrator needs to put a valid ANTHROPIC_API_KEY in Vercel and redeploy.";
  }
  if (err instanceof Anthropic.RateLimitError) return "Maximus AI is busy right now. Please try again in a minute.";
  if (err instanceof Anthropic.NotFoundError) return "The AI model configured for Maximus isn't available on this API key. An administrator should check MAXIMUS_AI_MODEL.";
  if (err instanceof Anthropic.BadRequestError && /credit|billing|balance/i.test(err.message)) {
    return "The Claude account has run out of credit. An administrator needs to add credit at console.anthropic.com.";
  }
  if (err instanceof Anthropic.APIError && err.status && err.status >= 500) return "Maximus AI is temporarily unavailable. Please try again shortly.";
  if (err instanceof Anthropic.APIConnectionError) return "Maximus AI couldn't reach Claude. Please try again.";
  return "Sorry, something went wrong generating a reply. Please try again.";
}
