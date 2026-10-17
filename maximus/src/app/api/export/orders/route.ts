import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { toCsv } from "@/lib/csv";

/** Monthly business report as CSV. Rows are limited by RLS to what the member may see. */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const month = request.nextUrl.searchParams.get("month") ?? "";
  if (!/^\d{4}-\d{2}-01$/.test(month)) return NextResponse.json({ error: "Invalid month" }, { status: 400 });
  const [y, m] = month.split("-").map(Number);
  const next = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
  const scope = request.nextUrl.searchParams.get("scope");

  let q = supabase.from("orders").select("order_date, amount, business_volume, category, status, customer_name, profiles!orders_member_id_fkey(member_id, full_name)")
    .gte("order_date", month).lt("order_date", next).order("order_date");
  q = scope === "team" ? q.neq("member_id", user.id) : q.eq("member_id", user.id);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "Could not export" }, { status: 500 });

  const rows = (data ?? []).map((o) => {
    const p = o.profiles as unknown as { member_id: string; full_name: string } | null;
    return {
      date: o.order_date, member_id: p?.member_id ?? "", member: p?.full_name ?? "", customer: o.customer_name ?? "",
      category: o.category ?? "", amount: o.amount, business_volume: o.business_volume ?? "", status: o.status,
    };
  });
  return new NextResponse(toCsv(rows.length ? rows : [{ date: "", member_id: "", member: "", customer: "", category: "", amount: "", business_volume: "", status: "" }]), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="maximus-orders-${month.slice(0, 7)}-${scope === "team" ? "team" : "mine"}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
