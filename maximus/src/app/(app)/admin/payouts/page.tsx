import { redirect } from "next/navigation";
import { Landmark, Send } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { isFlutterwaveConfigured, payoutBalance } from "@/lib/flutterwave";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatRelative } from "@/lib/utils";
import { PayoutDecision, PayoutRefresh } from "./payout-actions";

export const metadata = { title: "Payouts" };

type Row = {
  id: string; reference: string; amount: number; bank_name: string; account_name: string; account_number: string; recipient_type: string;
  account_kind: string; narration: string | null; status: string; created_at: string; provider_id: number | null; provider_message: string | null;
  profiles: { full_name: string; member_id: string } | null;
};

export default async function PayoutsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("is_payout_approver");
  if (!allowed) redirect("/forbidden");
  const live = isFlutterwaveConfigured();
  const [{ data }, balance] = await Promise.all([
    supabase.from("payout_requests").select("*, profiles!payout_requests_user_id_fkey(full_name, member_id)").order("created_at", { ascending: false }).limit(200).returns<Row[]>(),
    live ? payoutBalance() : Promise.resolve(null),
  ]);
  const rows = data ?? [];
  const waiting = rows.filter((r) => r.status === "pending");
  const sending = rows.filter((r) => r.status === "approved" || r.status === "processing");
  const done = rows.filter((r) => !["pending", "approved", "processing"].includes(r.status)).slice(0, 50);
  const waitingTotal = waiting.reduce((a, r) => a + Number(r.amount), 0);

  const line = (r: Row) => (
    <div className="min-w-0">
      <p className="font-semibold">{formatMoney(r.amount)} · {r.profiles?.full_name ?? "Member"} <span className="text-xs font-normal text-fg-subtle">{r.profiles?.member_id}</span></p>
      <p className="text-sm text-fg-muted">To <b>{r.account_name}</b> · {r.bank_name} · {r.account_number} {r.recipient_type === "self" ? <Badge tone="green">own account</Badge> : <Badge tone="amber">someone else</Badge>}</p>
      <p className="text-xs text-fg-subtle">From {r.account_kind}{r.narration ? ` · "${r.narration}"` : ""} · {formatRelative(r.created_at)}</p>
    </div>
  );

  return (
    <>
      <PageHeader eyebrow="Organisation" title="Payouts" description="Withdrawals and bank transfers members asked for. Approving sends the money through Flutterwave." />
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <StatCard label="Flutterwave balance" value={balance === null ? "—" : formatMoney(balance)} hint={live ? "Available for payouts" : "Flutterwave not connected"} icon={<Landmark className="size-5" aria-hidden />} />
        <StatCard label="Waiting for approval" value={formatMoney(waitingTotal)} hint={`${waiting.length} request${waiting.length === 1 ? "" : "s"}`} icon={<Send className="size-5" aria-hidden />} tone="lime" />
        <StatCard label="Sending" value={sending.length} icon={<Send className="size-5" aria-hidden />} tone="green" />
      </div>
      {balance !== null && waitingTotal > balance && (
        <p className="mb-4 rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">Your Flutterwave balance is lower than the requests waiting. Top it up before approving them all.</p>
      )}
      <div className="space-y-6">
        <Card>
          <CardHeader title="Waiting for approval" description={viewer.roles.includes("super_admin") ? "You can't approve your own requests." : undefined} />
          <CardBody className="divide-y divide-border pt-0">
            {waiting.length === 0 ? <EmptyState icon={<Send className="size-6" aria-hidden />} title="Nothing waiting" /> : waiting.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                {line(r)}
                {r.profiles && <PayoutDecision id={r.id} label={`${formatMoney(r.amount)} to ${r.account_name}`} />}
              </div>
            ))}
          </CardBody>
        </Card>
        {sending.length > 0 && (
          <Card>
            <CardHeader title="Sending" description="Flutterwave usually confirms within minutes." />
            <CardBody className="divide-y divide-border pt-0">
              {sending.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  {line(r)}
                  <PayoutRefresh reference={r.reference} transferId={r.provider_id} />
                </div>
              ))}
            </CardBody>
          </Card>
        )}
        <Card>
          <CardHeader title="History" />
          <CardBody className="divide-y divide-border pt-0">
            {done.length === 0 ? <p className="py-4 text-sm text-fg-muted">No payouts yet.</p> : done.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                {line(r)}
                <span className="text-right">
                  <Badge tone={r.status === "successful" ? "green" : r.status === "cancelled" ? "neutral" : "red"}>{r.status}</Badge>
                  {r.provider_message && r.status === "failed" && <span className="block max-w-xs text-xs text-fg-muted">{r.provider_message}</span>}
                </span>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
