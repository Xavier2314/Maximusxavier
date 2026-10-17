import { redirect } from "next/navigation";
import { CalendarCheck, Paperclip, Scale, Wallet } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney, formatRelative, formatTime } from "@/lib/utils";
import { AdjustmentForm, CorrectionDecision, PaymentDecision } from "./decisions";

export const metadata = { title: "Approvals" };

type Payment = { id: string; kind: string; amount: number; occurred_on: string; note: string | null; receipt_path: string | null; created_at: string;
  profiles: { full_name: string; member_id: string; avatar_url: string | null } | null; financial_accounts: { kind: string } | null };
type Correction = { id: string; requested_date: string; requested_check_in: string | null; requested_check_out: string | null; reason: string; created_at: string;
  profiles: { full_name: string; member_id: string; avatar_url: string | null } | null; offices: { name: string } | null };

export default async function ApprovalsPage() {
  const viewer = await requireViewer();
  const canPay = viewer.can("approve_financial_transactions");
  const canAtt = viewer.can("approve_attendance_exceptions") || viewer.can("manage_office");
  if (!canPay && !canAtt) redirect("/forbidden");
  const supabase = await createClient();
  const [{ data: payments }, { data: corrections }] = await Promise.all([
    canPay ? supabase.from("financial_transactions")
      .select("id, kind, amount, occurred_on, note, receipt_path, created_at, profiles!financial_transactions_user_id_fkey(full_name, member_id, avatar_url), financial_accounts(kind)")
      .eq("status", "pending").neq("user_id", viewer.id).order("created_at").limit(100).returns<Payment[]>() : Promise.resolve({ data: [] as Payment[] }),
    canAtt ? supabase.from("attendance_corrections")
      .select("id, requested_date, requested_check_in, requested_check_out, reason, created_at, profiles!attendance_corrections_user_id_fkey(full_name, member_id, avatar_url), offices(name)")
      .eq("status", "pending").neq("user_id", viewer.id).order("created_at").limit(100).returns<Correction[]>() : Promise.resolve({ data: [] as Correction[] }),
  ]);

  return (
    <>
      <PageHeader eyebrow="Administration" title="Approvals" description="Review submitted payments and attendance corrections. Every decision is audited and the member is notified." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {canPay && (
            <Card>
              <CardHeader title="Payments awaiting confirmation" icon={<Wallet className="size-4" />} description={`${payments?.length ?? 0} pending`} />
              <CardBody className="pt-2">
                {(payments ?? []).length === 0 ? <EmptyState className="py-8" icon={<Wallet className="size-6" />} title="All caught up" /> : (
                  <ul className="divide-y divide-border">
                    {(payments ?? []).map((p) => (
                      <li key={p.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                        <Avatar name={p.profiles?.full_name ?? "?"} src={p.profiles?.avatar_url} size={40} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{p.profiles?.full_name} <span className="text-xs font-normal text-fg-subtle">{p.profiles?.member_id}</span></p>
                          <p className="text-sm text-fg-muted">
                            <Badge tone={p.kind === "withdrawal" ? "amber" : "blue"}>{p.kind}</Badge>{" "}
                            <b className="tabular-nums text-fg">{formatMoney(p.amount)}</b> · {p.financial_accounts?.kind} · paid {formatDate(p.occurred_on)} · submitted {formatRelative(p.created_at)}
                          </p>
                          {p.note && <p className="mt-1 text-sm text-fg-subtle">“{p.note}”</p>}
                          {p.receipt_path ? (
                            <a href={`/api/receipts?path=${encodeURIComponent(p.receipt_path)}`} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1 text-sm text-primary hover:underline"><Paperclip className="size-3.5" aria-hidden /> View receipt</a>
                          ) : <p className="mt-1 text-xs text-warning">No receipt attached</p>}
                        </div>
                        <PaymentDecision id={p.id} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}
          {canAtt && (
            <Card>
              <CardHeader title="Attendance corrections" icon={<CalendarCheck className="size-4" />} description={`${corrections?.length ?? 0} pending`} />
              <CardBody className="pt-2">
                {(corrections ?? []).length === 0 ? <EmptyState className="py-8" icon={<CalendarCheck className="size-6" />} title="No pending corrections" /> : (
                  <ul className="divide-y divide-border">
                    {(corrections ?? []).map((c) => (
                      <li key={c.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center">
                        <Avatar name={c.profiles?.full_name ?? "?"} src={c.profiles?.avatar_url} size={40} />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{c.profiles?.full_name} <span className="text-xs font-normal text-fg-subtle">{c.offices?.name}</span></p>
                          <p className="text-sm text-fg-muted">
                            {formatDate(c.requested_date, { weekday: "short", day: "numeric", month: "short" })}
                            {c.requested_check_in && ` · in ${formatTime(c.requested_check_in)}`}{c.requested_check_out && ` · out ${formatTime(c.requested_check_out)}`}
                          </p>
                          <p className="mt-1 text-sm">“{c.reason}”</p>
                        </div>
                        <CorrectionDecision id={c.id} />
                      </li>
                    ))}
                  </ul>
                )}
              </CardBody>
            </Card>
          )}
        </div>
        {canPay && (
          <Card className="h-fit">
            <CardHeader title="Record a ledger adjustment" icon={<Scale className="size-4" />} description="Corrections are new entries; nothing is ever edited or deleted." />
            <CardBody><AdjustmentForm /></CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
