import { db, dbConfigured } from "@/lib/db";
import { formatLagos } from "@/lib/tickets";

type Row = { id: number; actor: string; action: string; target: string | null; details: unknown; created_at: string };

export default async function Audit() {
  let rows: Row[] = [];
  if (dbConfigured()) {
    const { data } = await db().from("admin_audit").select("*").order("created_at", { ascending: false }).limit(200);
    rows = (data as Row[]) ?? [];
  }
  return (
    <>
      <h1 className="font-display text-4xl text-navy">Audit log</h1>
      <p className="mt-2 text-sm text-slate">Sensitive admin changes, newest first.</p>
      <div className="mt-8 overflow-x-auto bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-navy text-xs uppercase tracking-wider text-white"><tr>{["When", "Who", "Action", "Target", "Details"].map((h) => <th key={h} className="px-3 py-3">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-sand">
            {rows.map((r) => <tr key={r.id} className="align-top"><td className="px-3 py-2 text-xs">{formatLagos(r.created_at)}</td><td className="px-3 py-2">{r.actor}</td><td className="px-3 py-2 font-mono text-xs">{r.action}</td><td className="px-3 py-2 font-mono text-xs">{r.target ?? "-"}</td><td className="max-w-md truncate px-3 py-2 font-mono text-xs">{JSON.stringify(r.details)}</td></tr>)}
            {!rows.length && <tr><td colSpan={5} className="px-3 py-10 text-center text-slate">No entries yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
