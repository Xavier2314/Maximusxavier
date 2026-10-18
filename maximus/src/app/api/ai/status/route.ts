import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { AI_MODEL, aiClient, isAiConfigured } from "@/lib/ai";

export const dynamic = "force-dynamic";

let cache: { at: number; body: Record<string, unknown> } | null = null;

/** Public health check: is Maximus AI working? Never reveals the key. Cached for 2 minutes. */
export async function GET() {
  if (cache && Date.now() - cache.at < 120_000) return NextResponse.json(cache.body);
  let body: Record<string, unknown>;
  if (!isAiConfigured()) body = { ok: false, reason: "not_configured" };
  else {
    try {
      await aiClient().messages.create({ model: AI_MODEL, max_tokens: 5, messages: [{ role: "user", content: "Say OK" }] });
      body = { ok: true, model: AI_MODEL };
    } catch (err) {
      body = {
        ok: false, model: AI_MODEL,
        reason: err instanceof Anthropic.AuthenticationError ? "invalid_key"
          : err instanceof Anthropic.PermissionDeniedError ? "permission_denied"
          : err instanceof Anthropic.NotFoundError ? "model_not_found"
          : err instanceof Anthropic.RateLimitError ? "rate_limited"
          : err instanceof Anthropic.BadRequestError ? `bad_request: ${err.message.slice(0, 120)}`
          : err instanceof Anthropic.APIError ? `api_error_${err.status}` : "connection_error",
      };
    }
  }
  cache = { at: Date.now(), body };
  return NextResponse.json(body);
}
