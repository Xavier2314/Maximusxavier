import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

/** Member directory export for administrators (RLS limits rows to what the caller may see). */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data: perms } = await supabase.rpc("my_permissions");
  if (!((perms as string[] | null) ?? []).includes("view_org_analytics")) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { data } = await supabase.from("profiles")
    .select("member_id, full_name, email, phone, whatsapp, status, joined_at, offices!profiles_office_id_fkey(name), sponsor:profiles!profiles_sponsor_id_fkey(member_id)")
    .order("joined_at");
  const rows = (data ?? []).map((p) => ({
    member_id: p.member_id, name: p.full_name, email: p.email, phone: p.phone ?? "", whatsapp: p.whatsapp ?? "",
    office: (p.offices as unknown as { name: string } | null)?.name ?? "", sponsor: (p.sponsor as unknown as { member_id: string } | null)?.member_id ?? "",
    status: p.status, joined: String(p.joined_at).slice(0, 10),
  }));
  return new NextResponse(toCsv(rows), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="maximus-members-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
