import Link from "next/link";
import { ScrollText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatTime } from "@/lib/utils";

export const metadata = { title: "Audit log" };
const PAGE = 50;

type Log = { id: number; action: string; entity: string; entity_id: string | null; data: Record<string, unknown>; created_at: string;
  profiles: { full_name: string; member_id: string } | null };

export default async function AuditPage({ searchParams }: { searchParams: Promise<{ action?: string; page?: string }> }) {
  await requirePermission("view_org_analytics");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();
  let q = supabase.from("audit_logs").select("id, action, entity, entity_id, data, created_at, profiles(full_name, member_id)", { count: "exact" })
    .order("created_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.action) q = q.eq("action", sp.action);
  const { data, count } = await q.returns<Log[]>();
  const actions = ["role_granted", "role_revoked", "sponsor_changed", "status_changed", "transaction_confirmed", "transaction_rejected",
    "ledger_adjustment", "ledger_reversal", "attendance_correction_approved", "attendance_correction_rejected", "bootstrap_super_admin"];

  return (
    <>
      <PageHeader eyebrow="Administration" title="Audit log" description="An append-only record of sensitive actions. Entries cannot be edited or deleted." />
      <Card>
        <form className="flex gap-2 border-b border-border p-4">
          <Select name="action" defaultValue={sp.action ?? ""} aria-label="Filter by action" className="max-w-xs">
            <option value="">All actions</option>
            {actions.map((a) => <option key={a} value={a}>{a.replace(/_/g, " ")}</option>)}
          </Select>
          <button className="rounded-xl bg-primary px-4 text-sm font-medium text-primary-fg">Filter</button>
        </form>
        {(data ?? []).length === 0 ? <EmptyState icon={<ScrollText className="size-6" />} title="No audit entries" /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-fg-subtle">
                <tr className="border-b border-border"><th scope="col" className="px-4 py-3 font-medium">When</th><th scope="col" className="px-4 py-3 font-medium">Who</th><th scope="col" className="px-4 py-3 font-medium">Action</th><th scope="col" className="px-4 py-3 font-medium">Details</th></tr>
              </thead>
              <tbody>
                {(data ?? []).map((l) => (
                  <tr key={l.id} className="border-b border-border/60 align-top last:border-0">
                    <td className="whitespace-nowrap px-4 py-3 text-fg-muted">{formatDate(l.created_at)} {formatTime(l.created_at)}</td>
                    <td className="px-4 py-3">{l.profiles?.full_name ?? "System"}<span className="block text-xs text-fg-subtle">{l.profiles?.member_id}</span></td>
                    <td className="px-4 py-3 font-medium">{l.action.replace(/_/g, " ")}<span className="block text-xs font-normal text-fg-subtle">{l.entity} {l.entity_id?.slice(0, 8)}</span></td>
                    <td className="px-4 py-3"><code className="block max-w-md whitespace-pre-wrap break-all text-xs text-fg-muted">{JSON.stringify(l.data)}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex justify-between border-t border-border p-4 text-sm text-fg-muted">
          <span>{count ?? 0} entries</span>
          <span className="flex gap-3">
            {page > 1 && <Link href={`/admin/audit?${new URLSearchParams({ ...(sp.action ? { action: sp.action } : {}), page: String(page - 1) })}`} className="text-primary">Previous</Link>}
            {page * PAGE < (count ?? 0) && <Link href={`/admin/audit?${new URLSearchParams({ ...(sp.action ? { action: sp.action } : {}), page: String(page + 1) })}`} className="text-primary">Next</Link>}
          </span>
        </div>
      </Card>
    </>
  );
}
