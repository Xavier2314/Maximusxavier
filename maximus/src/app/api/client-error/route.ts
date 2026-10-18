import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

/** Browser errors reported by the error screens, written to the server log so they can be diagnosed. */
export async function POST(request: NextRequest) {
  const text = (await request.text()).slice(0, 4000);
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  const row = {
    message: String(body.message ?? "").slice(0, 500),
    name: String(body.name ?? "").slice(0, 100),
    digest: String(body.digest ?? "").slice(0, 100),
    url: String(body.url ?? "").slice(0, 300),
    stack: String(body.stack ?? "").slice(0, 2500),
    user_agent: request.headers.get("user-agent")?.slice(0, 200) ?? null,
  };
  console.error("[client-error]", JSON.stringify(row));
  // Also keep it in the database: Vercel's free plan only keeps logs for an hour.
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const { data: { user } } = await (await createClient()).auth.getUser();
      await createAdminClient().from("client_errors").insert({ ...row, user_id: user?.id ?? null });
    } catch { /* never fail the report */ }
  }
  return new NextResponse(null, { status: 204 });
}
