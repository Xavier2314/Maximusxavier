import Link from "next/link";
import { BarChart3, Download, Package, Plus, ShoppingBag, TrendingUp } from "lucide-react";
import { TrendBars } from "@/components/charts";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Order, TeamMemberStat } from "@/lib/types";
import { addMonths, cn, formatDate, formatMoney, formatNumber, monthStart, todayIn } from "@/lib/utils";
import { OrderForm } from "./order-form";
import { StatusSelect } from "./status-select";

export const metadata = { title: "Orders" };

type Row = Order & { profiles: { full_name: string } | null };

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ month?: string; scope?: string }> }) {
  const viewer = await requireViewer();
  const sp = await searchParams;
  const today = todayIn(viewer.profile.timezone);
  const month = /^\d{4}-\d{2}-01$/.test(sp.month ?? "") ? sp.month! : monthStart(today);
  const next = addMonths(month, 1);
  const canTeam = viewer.can("view_direct_downlines") || viewer.can("view_extended_downline");
  const scope = canTeam && sp.scope === "team" ? "team" : "mine";
  const supabase = await createClient();

  let query = supabase.from("orders").select("*, profiles!orders_member_id_fkey(full_name)")
    .gte("order_date", month).lt("order_date", next).order("order_date", { ascending: false }).limit(200);
  if (scope === "mine") query = query.eq("member_id", viewer.id);
  else query = query.neq("member_id", viewer.id);

  const [{ data: orders }, teamRes, { data: sixMonths }] = await Promise.all([
    query.returns<Row[]>(),
    viewer.can("view_team_dashboard") ? supabase.rpc("team_member_stats", { p_root: viewer.id }) : Promise.resolve({ data: [] }),
    supabase.from("orders").select("amount, order_date, status").eq("member_id", viewer.id).gte("order_date", addMonths(monthStart(today), -5)),
  ]);
  const rows = orders ?? [];
  const live = rows.filter((o) => o.status !== "cancelled");
  const total = live.reduce((a, o) => a + Number(o.amount), 0);
  const bv = live.reduce((a, o) => a + Number(o.business_volume ?? 0), 0);
  const byCategory = Object.entries(live.reduce<Record<string, number>>((acc, o) => {
    const k = o.category ?? "Uncategorised"; acc[k] = (acc[k] ?? 0) + Number(o.amount); return acc;
  }, {})).sort((a, b) => b[1] - a[1]);
  const trendMonths = Array.from({ length: 6 }, (_, i) => addMonths(monthStart(today), i - 5));
  const trend = trendMonths.map((m) => ({
    month: formatDate(m, { month: "short" }),
    sales: ((sixMonths ?? []) as { amount: number; order_date: string; status: string }[])
      .filter((o) => o.status !== "cancelled" && o.order_date >= m && o.order_date < addMonths(m, 1)).reduce((a, o) => a + Number(o.amount), 0),
  }));
  const teamMembers = ((teamRes.data as TeamMemberStat[] | null) ?? []).map((m) => ({ id: m.member, name: m.full_name }));
  const monthOptions = Array.from({ length: 12 }, (_, i) => addMonths(monthStart(today), -i));
  const href = (p: Record<string, string>) => `/orders?${new URLSearchParams({ month, scope, ...p })}`;

  return (
    <>
      <PageHeader eyebrow="Business" title="Orders & activity" description="Record product orders and track monthly business performance."
        action={<LinkButton href={`/api/export/orders?month=${month}&scope=${scope}`} variant="outline" size="sm" prefetch={false}><Download className="size-4" aria-hidden /> Export report</LinkButton>} />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {canTeam && (
          <div className="flex rounded-xl bg-surface-muted p-1" role="tablist" aria-label="Whose orders">
            {(["mine", "team"] as const).map((s) => (
              <Link key={s} href={href({ scope: s })} role="tab" aria-selected={scope === s}
                className={cn("rounded-lg px-3 py-1.5 text-sm font-medium", scope === s ? "bg-surface text-fg shadow-sm" : "text-fg-muted")}>
                {s === "mine" ? "My orders" : "Team orders"}
              </Link>
            ))}
          </div>
        )}
        <div className="flex gap-1 overflow-x-auto scrollbar-none" role="tablist" aria-label="Month">
          {monthOptions.slice(0, 6).map((m) => (
            <Link key={m} href={href({ month: m })} role="tab" aria-selected={m === month}
              className={cn("whitespace-nowrap rounded-lg px-3 py-1.5 text-sm", m === month ? "bg-primary text-white" : "text-fg-muted hover:bg-surface-muted")}>
              {formatDate(m, { month: "short", year: "2-digit" })}
            </Link>
          ))}
        </div>
      </div>

      <section className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard label="Sales" value={formatMoney(total)} hint={formatDate(month, { month: "long", year: "numeric" })} icon={<TrendingUp className="size-4" />} />
        <StatCard label="Orders" value={live.length} hint={`${rows.length - live.length} cancelled`} icon={<ShoppingBag className="size-4" />} tone="green" />
        <StatCard label="Business volume" value={formatNumber(bv)} icon={<Package className="size-4" />} tone="lime" />
        <StatCard label="Average order" value={formatMoney(live.length ? total / live.length : 0)} icon={<BarChart3 className="size-4" />} tone="navy" />
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title={scope === "mine" ? "My orders" : "Team orders"} icon={<ShoppingBag className="size-4" />} />
            {rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-sm">
                  <thead className="text-left text-xs uppercase tracking-wide text-fg-subtle">
                    <tr className="border-b border-border">
                      <th scope="col" className="px-4 py-3 font-medium">Date</th>
                      {scope === "team" && <th scope="col" className="px-4 py-3 font-medium">Member</th>}
                      <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                      <th scope="col" className="px-4 py-3 font-medium">Category</th>
                      <th scope="col" className="px-4 py-3 text-right font-medium">Amount</th>
                      <th scope="col" className="px-4 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((o) => (
                      <tr key={o.id} className="border-b border-border/60 last:border-0">
                        <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{formatDate(o.order_date, { day: "numeric", month: "short" })}</td>
                        {scope === "team" && <td className="px-4 py-3">{o.profiles?.full_name}</td>}
                        <td className="px-4 py-3">{o.customer_name ?? "—"}</td>
                        <td className="px-4 py-3 text-fg-muted">{o.category ?? "—"}</td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatMoney(o.amount)}</td>
                        <td className="px-4 py-3"><StatusSelect id={o.id} status={o.status} editable={o.recorded_by === viewer.id || viewer.isAdmin} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <EmptyState icon={<ShoppingBag className="size-6" />} title="No orders this month" description="Record your first order to start tracking sales." />}
          </Card>
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader title="My sales trend" description="Last 6 months" icon={<TrendingUp className="size-4" />} />
              <CardBody><TrendBars data={trend} xKey="month" valueFormat="money" series={[{ key: "sales", label: "Sales" }]} caption="Monthly sales" height={200} /></CardBody>
            </Card>
            <Card>
              <CardHeader title="By category" description={formatDate(month, { month: "long" })} icon={<Package className="size-4" />} />
              <CardBody className="space-y-3">
                {byCategory.length > 0 ? byCategory.map(([cat, amt]) => (
                  <div key={cat}>
                    <div className="mb-1 flex justify-between text-sm"><span>{cat}</span><span className="tabular-nums text-fg-muted">{formatMoney(amt)}</span></div>
                    <div className="h-2 overflow-hidden rounded-full bg-surface-muted"><div className="h-full rounded-full bg-[var(--chart-1)]" style={{ width: `${(amt / total) * 100}%` }} /></div>
                  </div>
                )) : <p className="py-6 text-center text-sm text-fg-muted">No sales yet.</p>}
              </CardBody>
            </Card>
          </div>
        </div>
        <Card className="h-fit">
          <CardHeader title="Record an order" icon={<Plus className="size-4" />} />
          <CardBody><OrderForm members={teamMembers} selfId={viewer.id} today={today} /></CardBody>
        </Card>
      </div>
    </>
  );
}
