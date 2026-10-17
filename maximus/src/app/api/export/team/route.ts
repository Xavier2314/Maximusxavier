import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";
import type { TeamMemberStat } from "@/lib/types";

/** CSV export of the signed-in member's visible team. RLS and team_member_stats() enforce scope. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { data: perms } = await supabase.rpc("my_permissions");
  const extended = ((perms as string[] | null) ?? []).includes("view_extended_downline");
  const { data, error } = await supabase.rpc("team_member_stats", { p_root: user.id, p_max_depth: extended ? null : 1 });
  if (error) return NextResponse.json({ error: "You are not authorised to export this team" }, { status: 403 });

  const rows = (data as TeamMemberStat[]).map((m) => ({
    member_id: m.member_code, name: m.full_name, level: m.depth, office: m.office_name ?? "",
    joined: m.joined_at.slice(0, 10), status: m.status, active: m.is_active ? "yes" : "no",
    attendance_days_30d: m.attendance_days, prospects_30d: m.prospects, orders_30d: m.orders, sales_30d: m.sales,
    evaluations_30d: m.evaluations, last_activity: m.last_activity ?? "",
  }));
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="maximus-team-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
