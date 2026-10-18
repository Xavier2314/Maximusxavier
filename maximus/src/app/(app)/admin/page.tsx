import Link from "next/link";
import { ArrowRight, Building2, ClipboardCheck, HandCoins, PiggyBank, ShieldCheck, TrendingUp, UserPlus, Users } from "lucide-react";
import { TrendArea, TrendBars } from "@/components/charts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader, StatCard } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addMonths, cn, formatDate, formatMoney, formatNumber, monthStart, todayIn } from "@/lib/utils";

export const metadata = { title: "Admin overview" };

const RANGES = { "3m": 3, "6m": 6, "12m": 12 } as const;

export default async function AdminOverviewPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const viewer = await requirePermission("view_org_analytics");
  const { range } = await searchParams;
  const months = RANGES[(range as keyof typeof RANGES) ?? "6m"] ?? 6;
  const supabase = await createClient();
  const today = todayIn(viewer.profile.timezone);
  const from = addMonths(monthStart(today), -(months - 1));

  const [{ data: overview }, { data: joins }, { data: offices }, { data: todayAtt }, { data: orders }, { data: officeStats }, { data: bankWaitlist }] = await Promise.all([
    supabase.rpc("org_overview"),
    supabase.from("profiles").select("joined_at"),
    supabase.from("offices").select("id, name").eq("is_active", true).order("name"),
    supabase.from("attendance").select("office_id, status, check_out_at").eq("attendance_date", today),
    supabase.from("orders").select("amount, order_date, status").gte("order_date", from),
    supabase.rpc("offices_overview"),
    supabase.rpc("bank_waitlist_count"),
  ]);
  type OfficeStat = { office: string; name: string; members: number; present_today: number; late_today: number; attendance_rate_7d: number; month_earnings: number; new_members_month: number };
  // Offices that need attention first: lowest attendance this week.
  const officeRows = ((officeStats ?? []) as OfficeStat[]).sort((a, b) => a.attendance_rate_7d - b.attendance_rate_7d);
  const o = (overview ?? {}) as Record<string, number>;
  const monthList = Array.from({ length: months }, (_, i) => addMonths(from, i));
  const joinDates = (joins ?? []).map((j) => (j.joined_at as string).slice(0, 10));
  const growth = monthList.map((m) => ({
    month: formatDate(m, { month: "short" }),
    total: joinDates.filter((d) => d < addMonths(m, 1)).length,
    joined: joinDates.filter((d) => d >= m && d < addMonths(m, 1)).length,
  }));
  const sales = monthList.map((m) => ({
    month: formatDate(m, { month: "short" }),
    sales: ((orders ?? []) as { amount: number; order_date: string; status: string }[])
      .filter((x) => x.status !== "cancelled" && x.order_date >= m && x.order_date < addMonths(m, 1)).reduce((a, x) => a + Number(x.amount), 0),
  }));
  const att = (todayAtt ?? []) as { office_id: string; status: string; check_out_at: string | null }[];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Organisation overview"
        action={
          <div className="flex rounded-xl bg-surface-muted p-1" role="tablist" aria-label="Date range">
            {Object.keys(RANGES).map((r) => (
              <Link key={r} href={`/admin?range=${r}`} role="tab" aria-selected={(range ?? "6m") === r}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", (range ?? "6m") === r ? "bg-surface shadow-sm" : "text-fg-muted")}>{r}</Link>
            ))}
          </div>
        } />

      {officeRows.length > 0 && (
        <Card className="mb-6">
          <CardHeader title="All offices at a glance" icon={<Building2 className="size-4" />}
            description={`Lowest attendance first, so you can see who needs you. ${(bankWaitlist as number | null) ?? 0} members on the Maximus Bank waitlist.`} />
          <CardBody className="overflow-x-auto pt-2">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-fg-subtle">
                <tr className="border-b border-border">
                  {["Office", "Members", "Present today", "Late today", "Attendance (7 days)", "Earnings this month", "New this month"].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium">{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {officeRows.map((r) => (
                  <tr key={r.office} className="border-b border-border/60 last:border-0">
                    <td className="px-3 py-3 font-medium"><Link href={`/attendance/register?office=${r.office}`} className="hover:text-primary">{r.name}</Link></td>
                    <td className="px-3 py-3 tabular-nums">{r.members}</td>
                    <td className="px-3 py-3 tabular-nums">{r.present_today}</td>
                    <td className="px-3 py-3 tabular-nums">{r.late_today}</td>
                    <td className="px-3 py-3"><span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", r.attendance_rate_7d >= 70 ? "bg-success-soft text-success" : r.attendance_rate_7d >= 40 ? "bg-warning-soft text-warning" : "bg-danger-soft text-danger")}>{r.attendance_rate_7d}%</span></td>
                    <td className="px-3 py-3 tabular-nums">{formatMoney(r.month_earnings)}</td>
                    <td className="px-3 py-3 tabular-nums">{r.new_members_month}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>
      )}

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Registered members" value={formatNumber(o.members_total)} hint={`${formatNumber(o.members_active)} active accounts`} icon={<Users className="size-4" />} />
        <StatCard label="New this month" value={formatNumber(o.new_this_month)} icon={<UserPlus className="size-4" />} tone="lime" />
        <StatCard label="Checked in today" value={formatNumber(o.checked_in_today)} hint={`${o.present_now ?? 0} in office now`} icon={<Building2 className="size-4" />} tone="green" />
        <StatCard label="Evaluations this period" value={formatNumber(o.evaluations_current_period)} icon={<ClipboardCheck className="size-4" />} tone="navy" />
        <StatCard label="Confirmed savings" value={formatMoney(o.confirmed_savings)} icon={<PiggyBank className="size-4" />} tone="green" />
        <StatCard label="Confirmed contributions" value={formatMoney(o.confirmed_contributions)} icon={<HandCoins className="size-4" />} />
        <StatCard label="Sales this month" value={formatMoney(o.sales_this_month)} icon={<TrendingUp className="size-4" />} tone="lime" />
        <Link href="/admin/approvals" className="block">
          <StatCard label="Awaiting approval" value={(o.pending_payments ?? 0) + (o.pending_corrections ?? 0)} hint={`${o.pending_payments ?? 0} payments · ${o.pending_corrections ?? 0} corrections`} icon={<ShieldCheck className="size-4" />} tone="navy" className="h-full hover:ring-2 hover:ring-primary/30" />
        </Link>
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Membership growth" description={`Total members, last ${months} months`} icon={<TrendingUp className="size-4" />} />
          <CardBody><TrendArea data={growth} xKey="month" series={[{ key: "total", label: "Members" }]} caption="Total members by month" /></CardBody>
        </Card>
        <Card>
          <CardHeader title="Sales" description={`Recorded orders, last ${months} months`} icon={<TrendingUp className="size-4" />} />
          <CardBody><TrendBars data={sales} xKey="month" valueFormat="money" series={[{ key: "sales", label: "Sales" }]} caption="Sales by month" /></CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader title="Office attendance today" icon={<Building2 className="size-4" />}
          action={<Link href="/attendance/live" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">Live board <ArrowRight className="size-4" aria-hidden /></Link>} />
        <CardBody>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-fg-subtle">
                <tr className="border-b border-border"><th className="py-2 font-medium" scope="col">Office</th><th className="py-2 font-medium" scope="col">Check-ins</th><th className="py-2 font-medium" scope="col">Verified</th><th className="py-2 font-medium" scope="col">Present now</th><th className="py-2 font-medium" scope="col">Need review</th></tr>
              </thead>
              <tbody>
                {(offices ?? []).map((off) => {
                  const rows = att.filter((a) => a.office_id === off.id);
                  return (
                    <tr key={off.id as string} className="border-b border-border/60 last:border-0">
                      <td className="py-2.5 font-medium">{off.name as string}</td>
                      <td className="py-2.5 tabular-nums">{rows.length}</td>
                      <td className="py-2.5 tabular-nums">{rows.filter((r) => ["verified_in_office", "approved_exception"].includes(r.status)).length}</td>
                      <td className="py-2.5 tabular-nums">{rows.filter((r) => !r.check_out_at && ["verified_in_office", "approved_exception"].includes(r.status)).length}</td>
                      <td className="py-2.5 tabular-nums">{rows.filter((r) => ["outside_radius", "location_unavailable", "pending_review"].includes(r.status)).length}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </>
  );
}
