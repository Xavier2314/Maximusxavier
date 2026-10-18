import { redirect } from "next/navigation";
import { BadgeCheck, CircleAlert, CircleHelp, Receipt } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatRelative } from "@/lib/utils";
import type { WhiteLabelFee, WhiteLabelRequest } from "@/lib/white-label";
import { DecideButtons } from "./decide-buttons";

export const metadata = { title: "White-label payments" };

type Row = WhiteLabelRequest & { offices: { name: string; display_name: string | null } | null; profiles: { full_name: string; member_id: string } | null };

const VERDICT = {
  match: { label: "AI: matches", tone: "green", icon: BadgeCheck },
  mismatch: { label: "AI: doesn't match", tone: "red", icon: CircleAlert },
  unclear: { label: "AI: couldn't read clearly", tone: "amber", icon: CircleHelp },
} as const;

export default async function WhiteLabelPaymentsPage() {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("super_admin")) redirect("/forbidden");
  const supabase = await createClient();
  const [{ data }, { data: feeRow }] = await Promise.all([
    supabase.from("white_label_requests")
      .select("*, offices(name, display_name), profiles!white_label_requests_requested_by_fkey(full_name, member_id)")
      .order("status").order("created_at", { ascending: false }).limit(50).returns<Row[]>(),
    supabase.from("app_settings").select("value").eq("key", "white_label_fee").maybeSingle(),
  ]);
  const fee = feeRow?.value as WhiteLabelFee | undefined;
  const rows = data ?? [];

  return (
    <>
      <PageHeader eyebrow="Organisation" title="White-label payments"
        description={fee ? `Offices pay ${formatMoney(fee.amount)} to ${fee.account_name} · ${fee.bank} ${fee.account_number} to remove "Powered by".` : undefined} />
      <p className="mb-6 rounded-2xl bg-warning-soft px-4 py-3 text-sm text-warning">
        The AI reads each screenshot and compares the amount and account, but screenshots can be edited.
        Before approving, confirm the money arrived in your bank app or SMS alert.
      </p>
      {rows.length === 0 ? (
        <Card><EmptyState icon={<Receipt className="size-6" />} title="No payments yet" description="When an office sends a receipt it appears here, and you get a notification." /></Card>
      ) : (
        <div className="space-y-4">
          {rows.map((r) => {
            const v = r.ai_verdict ? VERDICT[r.ai_verdict] : null;
            return (
              <Card key={r.id}>
                <CardBody className="grid gap-5 md:grid-cols-[220px_1fr]">
                  <a href={`/api/attachments?path=${encodeURIComponent(r.receipt_path)}`} target="_blank" rel="noopener noreferrer"
                    className="block overflow-hidden rounded-xl border border-border bg-surface-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={`/api/attachments?path=${encodeURIComponent(r.receipt_path)}`} alt="Transfer receipt" className="h-56 w-full object-contain" />
                  </a>
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">{r.offices?.display_name || r.offices?.name}</h2>
                      <Badge tone={r.status === "approved" ? "green" : r.status === "rejected" ? "red" : "blue"}>{r.status}</Badge>
                      {v && <Badge tone={v.tone}><v.icon className="size-3" aria-hidden />{v.label}</Badge>}
                    </div>
                    <p className="text-sm text-fg-muted">
                      Sent by {r.profiles?.full_name} ({r.profiles?.member_id}) · {formatRelative(r.created_at)} · expected {formatMoney(r.amount)}
                      {r.reference && <> · ref “{r.reference}”</>}
                    </p>
                    {r.ai_notes ? <pre className="whitespace-pre-wrap rounded-xl bg-surface-muted p-3 font-sans text-sm">{r.ai_notes}</pre>
                      : <p className="text-sm text-fg-subtle">No AI reading (AI not configured or it couldn&apos;t run). Check the screenshot yourself.</p>}
                    {r.status === "pending" ? <DecideButtons id={r.id} /> : r.review_note && <p className="text-sm text-fg-muted">Note: {r.review_note}</p>}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
