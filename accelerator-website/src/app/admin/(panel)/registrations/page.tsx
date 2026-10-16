import { db, dbConfigured } from "@/lib/db";
import { formatLagos, formatNaira } from "@/lib/tickets";
import type { Registration } from "@/lib/registrations";

const STATUSES = ["all", "paid", "pending", "failed", "abandoned", "duplicate_paid"];

export default async function Registrations({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; ticket?: string }> }) {
  const { q = "", status = "all", ticket = "all" } = await searchParams;
  let rows: Registration[] = [];
  if (dbConfigured()) {
    let query = db().from("registrations").select("*").order("created_at", { ascending: false }).limit(500);
    if (status !== "all") query = query.eq("status", status);
    if (ticket !== "all") query = query.eq("ticket_id", ticket);
    const term = q.trim().replace(/[%,()]/g, "");
    if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%,reference.ilike.%${term}%`);
    const { data } = await query;
    rows = (data as Registration[]) ?? [];
  }
  const exportHref = `/api/admin/export?${new URLSearchParams({ q, status, ticket }).toString()}`;
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="font-display text-4xl text-navy">Registrations</h1>
        <a href={exportHref} className="btn btn-ghost-dark min-h-11">Export CSV</a>
      </div>
      <form className="mt-8 grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
        <input name="q" defaultValue={q} placeholder="Search name, email, phone or reference" className="field" aria-label="Search" />
        <select name="status" defaultValue={status} className="field" aria-label="Status">{STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}</select>
        <select name="ticket" defaultValue={ticket} className="field" aria-label="Ticket"><option value="all">all tickets</option><option value="early_bird">Early Bird</option><option value="late">Late</option></select>
        <button className="btn btn-navy">Filter</button>
      </form>
      <p className="mt-4 text-sm text-slate">{rows.length} shown (max 500; use export for everything).</p>
      <div className="mt-4 overflow-x-auto bg-white">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-navy text-xs uppercase tracking-wider text-white"><tr>{["Reference", "Name", "Email", "Phone", "Ticket", "Amount", "Status", "Created", "Paid"].map((h) => <th key={h} className="px-3 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-sand">
            {rows.map((r) => (
              <tr key={r.id} className="align-top">
                <td className="px-3 py-3 font-mono text-xs">{r.reference}</td>
                <td className="px-3 py-3">{r.full_name}<div className="text-xs text-slate">{r.city} · {r.is_member}</div></td>
                <td className="px-3 py-3">{r.email}</td>
                <td className="px-3 py-3">{r.phone}</td>
                <td className="px-3 py-3">{r.ticket_id === "early_bird" ? "Early Bird" : "Late"}</td>
                <td className="px-3 py-3">{formatNaira(r.amount_kobo)}</td>
                <td className="px-3 py-3"><span className={`px-2 py-1 text-xs font-semibold ${r.status === "paid" ? "bg-royal text-white" : r.status === "pending" ? "bg-stone" : "bg-red/10 text-red"}`}>{r.status}</span></td>
                <td className="px-3 py-3 text-xs">{formatLagos(r.created_at)}</td>
                <td className="px-3 py-3 text-xs">{formatLagos(r.paid_at) ?? "-"}</td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={9} className="px-3 py-10 text-center text-slate">No registrations found.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
