import { NextResponse, type NextRequest } from "next/server";

/** Browser errors reported by the error screens, written to the server log so they can be diagnosed. */
export async function POST(request: NextRequest) {
  const text = (await request.text()).slice(0, 4000);
  let body: Record<string, unknown> = {};
  try { body = JSON.parse(text); } catch { body = { raw: text }; }
  console.error("[client-error]", JSON.stringify({
    message: String(body.message ?? "").slice(0, 500),
    name: String(body.name ?? "").slice(0, 100),
    digest: String(body.digest ?? "").slice(0, 100),
    url: String(body.url ?? "").slice(0, 300),
    stack: String(body.stack ?? "").slice(0, 2500),
    ua: request.headers.get("user-agent")?.slice(0, 200),
  }));
  return new NextResponse(null, { status: 204 });
}
