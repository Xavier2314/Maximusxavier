import { randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { GOOGLE_SCOPES, isGoogleConfigured } from "@/lib/followup";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Sends the member to Google to allow Maximus to send and read their prospect emails. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));
  if (!isGoogleConfigured()) return NextResponse.redirect(new URL("/settings?connect=google-not-configured#connections", request.url));
  const state = randomBytes(16).toString("hex");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: new URL("/api/integrations/google/callback", request.url).toString(),
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    login_hint: user.email ?? "",
    state,
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set("mx_google_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/api/integrations/google" });
  return res;
}
