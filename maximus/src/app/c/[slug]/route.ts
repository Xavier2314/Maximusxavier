import { NextResponse } from "next/server";
import { BRAND_COOKIE } from "@/lib/company-brand";
import { createAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** A company's own link: remembers the company (for branded sign-in pages) and opens its sign-up. */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  if (!/^[a-z0-9-]{3,40}$/.test(slug)) return NextResponse.redirect(new URL("/login", url));
  const admin = createAdminClient();
  const { data: office } = await admin.from("offices").select("id, manager_id").eq("slug", slug).eq("is_active", true).maybeSingle();
  if (!office) return NextResponse.redirect(new URL("/login", url));
  const { data: manager } = office.manager_id
    ? await admin.from("profiles").select("referral_code").eq("id", office.manager_id).maybeSingle() : { data: null };
  const target = url.searchParams.get("to") === "login"
    ? new URL("/login", url)
    : new URL(`/register?office=${office.id}${manager?.referral_code ? `&ref=${encodeURIComponent(manager.referral_code)}` : ""}`, url);
  const res = NextResponse.redirect(target);
  res.cookies.set(BRAND_COOKIE, office.id, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax", secure: url.protocol === "https:", httpOnly: true });
  return res;
}
