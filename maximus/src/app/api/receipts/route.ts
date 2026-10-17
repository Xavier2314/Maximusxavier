import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/** Redirects to a short-lived signed URL for a receipt. Storage RLS decides who may read it. */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!path || path.includes("..")) return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 60);
  if (error || !data) return NextResponse.json({ error: "Receipt not found or not authorised" }, { status: 404 });
  return NextResponse.redirect(data.signedUrl);
}
