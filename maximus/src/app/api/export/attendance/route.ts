import { NextResponse, type NextRequest } from "next/server";
import { toCsv } from "@/lib/csv";
import type { AttendanceRow } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";

/** CSV of the attendance report. attendance_report() checks the caller may see this office. */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const office = sp.get("office") ?? "";
  const from = sp.get("from") ?? "";
  const to = sp.get("to") ?? "";
  if (!/^[0-9a-f-]{36}$/.test(office) || !/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) {
    return NextResponse.json({ error: "Invalid report parameters" }, { status: 400 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { data, error } = await supabase.rpc("attendance_report", { p_office: office, p_from: from, p_to: to });
  if (error) return NextResponse.json({ error: "You are not authorised to export this report" }, { status: 403 });

  const rows = ((data as AttendanceRow[] | null) ?? []).map((r) => ({
    member_id: r.member_code, name: r.full_name, open_days: r.open_days, present: r.present_days, late: r.late_days,
    absent: r.absent_days, attendance_pct: r.attendance_pct ?? "", missed_in_a_row: r.absent_streak,
    last_check_in: r.last_check_in ?? "", last_active: r.last_activity ?? "",
  }));
  return new NextResponse(toCsv(rows.length ? rows : [{ note: "No members in this report" }]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${from}-to-${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
