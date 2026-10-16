import Link from "next/link";
import { db, dbConfigured } from "@/lib/db";
import { getTickets } from "@/lib/content";
import { formatNaira, ticketStatus } from "@/lib/tickets";

type Row = { status: string; ticket_id: string; amount_kobo: number };

export default async function Overview() {
  let rows: Row[] = [];
  if (dbConfigured()) {
    const { data } = await db().from("registrations").select("status, ticket_id, amount_kobo").limit(50000);
    rows = (data as Row[]) ?? [];
  }
  const tickets = await getTickets();
  const count = (f: (r: Row) => boolean) => rows.filter(f).length;
  const paid = rows.filter((r) => r.status === "paid");
  const revenue = paid.reduce((a, r) => a + r.amount_kobo, 0);
  const stats: [string, string | number][] = [
    ["Total registrations", rows.length], ["Confirmed payments", paid.length], ["Transfers to verify", count((r) => r.status === "awaiting_verification")], ["Awaiting payment", count((r) => r.status === "awaiting_payment" || r.status === "pending")],
    ["Failed / rejected", count((r) => ["failed", "abandoned", "rejected"].includes(r.status))], ["Early Bird (paid)", count((r) => r.status === "paid" && r.ticket_id === "early_bird")],
    ["Late (paid)", count((r) => r.status === "paid" && r.ticket_id === "late")], ["Revenue (verified)", formatNaira(revenue) ?? "₦0"],
  ];
  return (
    <>
      <h1 className="font-display text-4xl text-navy">Overview</h1>
      <dl className="mt-8 grid grid-cols-2 gap-px bg-sand lg:grid-cols-4">
        {stats.map(([k, v]) => <div key={k} className="bg-white p-6"><dd className="font-display text-4xl text-navy">{v}</dd><dt className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-slate">{k}</dt></div>)}
      </dl>
      <h2 className="mt-12 font-display text-2xl text-navy">Ticket windows (live status)</h2>
      <ul className="mt-4 divide-y divide-sand border-y border-sand bg-white">
        {tickets.map((t) => <li key={t.id} className="flex flex-wrap justify-between gap-4 p-4 text-sm"><span className="font-semibold text-navy">{t.name}</span><span>{formatNaira(t.priceKobo) ?? "Price not set"}</span><span className="uppercase tracking-wider text-slate">{ticketStatus(t).replace("_", " ")}</span></li>)}
      </ul>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/admin/registrations" className="btn btn-navy">View registrations</Link>
        <a href="/api/admin/export" className="btn btn-ghost-dark">Export CSV</a>
      </div>
    </>
  );
}
