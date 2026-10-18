import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Redirects to a short-lived signed URL for an order screenshot or shared file. Storage RLS decides access. */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path || path.includes("..")) return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("attachments").createSignedUrl(path, 60);
  if (error || !data) return NextResponse.json({ error: "File not found or not authorised" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
