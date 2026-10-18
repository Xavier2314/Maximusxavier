import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient, createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const done = (status: string) => {
    const res = NextResponse.redirect(new URL(`/settings?connect=${status}#connections`, request.url));
    res.cookies.delete({ name: "mx_google_state", path: "/api/integrations/google" });
    return res;
  };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  const q = request.nextUrl.searchParams;
  const code = q.get("code");
  if (!code || !q.get("state") || q.get("state") !== request.cookies.get("mx_google_state")?.value) return done("google-failed");

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code, client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: new URL("/api/integrations/google/callback", request.url).toString(), grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) return done("google-failed");
  const tok = (await tokenRes.json()) as { access_token: string; refresh_token?: string; expires_in: number; scope?: string; id_token?: string };
  if (!tok.scope?.includes("gmail.send")) return done("google-scope");
  let email: string | null = null;
  try {
    const info = await fetch("https://openidconnect.googleapis.com/v1/userinfo", { headers: { Authorization: `Bearer ${tok.access_token}` } });
    email = ((await info.json()) as { email?: string }).email ?? null;
  } catch { /* email is optional */ }

  const { error } = await createAdminClient().from("member_integrations").upsert({
    user_id: user.id, provider: "google", account_email: email, access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? null, expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
    scopes: tok.scope ?? null, connected_at: new Date().toISOString(),
  });
  return done(error ? "google-failed" : "google-connected");
}
