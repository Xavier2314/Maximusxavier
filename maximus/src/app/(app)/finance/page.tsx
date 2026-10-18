import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CreditCard, HandCoins, Landmark, PiggyBank, Plus, Receipt, Share2, TriangleAlert } from "lucide-react";
import { TrendBars } from "@/components/charts";
import { LedgerTable } from "@/components/ledger-table";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader, Progress } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AccountBalance, FinancialTransaction } from "@/lib/types";
import { addMonths, formatDate, formatMoney, monthStart, percent, todayIn } from "@/lib/utils";
import { ShareToggle } from "./share-toggle";
import { TargetForm } from "./target-form";
import { TransactionForm } from "./transaction-form";
import { PayOnline } from "../payments/pay-online";
import { isFlutterwaveConfigured } from "@/lib/flutterwave";

export const metadata = { title: "Finance" };

export default async function FinancePage({ searchParams }: { searchParams: Promise<{ member?: string }> }) {
  const viewer = await requireViewer();
  const { member } = await searchParams;
  const subjectId = member && member !== viewer.id ? member : viewer.id;
  const isSelf = subjectId === viewer.id;
  const supabase = await createClient();
  const today = todayIn(viewer.profile.timezone);

  const [{ data: subject }, { data: balances }, { data: txns }, { data: obligations }, { data: grants }, { data: uplines }] = await Promise.all([
    isSelf ? Promise.resolve({ data: { full_name: viewer.profile.full_name } }) : supabase.from("profiles").select("full_name").eq("id", subjectId).maybeSingle(),
    supabase.from("financial_account_balances").select("*").eq("user_id", subjectId).returns<AccountBalance[]>(),
    supabase.from("financial_transactions").select("*, financial_accounts(kind)").eq("user_id", subjectId)
      .order("created_at", { ascending: false }).limit(100).returns<(FinancialTransaction & { financial_accounts: { kind: string } | null })[]>(),
    supabase.from("financial_obligations").select("id, title, amount, due_date, status").eq("user_id", subjectId).eq("status", "open").order("due_date"),
    isSelf ? supabase.from("financial_access_grants").select("viewer_id").eq("member_id", viewer.id) : Promise.resolve({ data: [] }),
    isSelf ? supabase.from("profiles").select("id, full_name, avatar_url, member_id")
      .in("id", [viewer.profile.sponsor_id, viewer.profile.upline_id].filter(Boolean) as string[]) : Promise.resolve({ data: [] }),
  ]);
  // For someone else's finances, RLS returns nothing unless access was granted.
  if (!isSelf && (!subject || !balances || balances.length === 0)) notFound();

  const rows = (txns ?? []).map((t) => ({ ...t, account_kind: t.financial_accounts?.kind }));
  const thisMonth = monthStart(today);
  const months = Array.from({ length: 6 }, (_, i) => addMonths(thisMonth, i - 5));
  const monthly = months.map((m) => {
    const next = addMonths(m, 1);
    const inMonth = rows.filter((t) => t.status === "confirmed" && t.occurred_on >= m && t.occurred_on < next);
    return {
      month: formatDate(m, { month: "short" }),
      savings: inMonth.filter((t) => t.account_kind === "savings").reduce((a, t) => a + t.direction * Number(t.amount), 0),
      contributions: inMonth.filter((t) => t.account_kind === "contributions").reduce((a, t) => a + t.direction * Number(t.amount), 0),
    };
  });
  const granted = new Set(((grants ?? []) as { viewer_id: string }[]).map((g) => g.viewer_id));
  const outstanding = ((obligations ?? []) as { id: string; title: string; amount: number; due_date: string | null }[]);

  return (
    <>
      {!isSelf && <Link href={`/team/${subjectId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Member</Link>}
      <PageHeader eyebrow="Finance" title={isSelf ? "Savings & contributions" : `${subject?.full_name}'s finances`}
        description="Balances are calculated from approved ledger entries. They are organisation records, not verified bank balances." />

      <section className="grid gap-4 sm:grid-cols-2" aria-label="Balances">
        {(balances ?? []).map((b) => (
          <div key={b.account_id} className={`relative overflow-hidden rounded-[1.5rem] p-6 text-white ${b.kind === "savings" ? "hero-gradient" : "bg-gradient-to-br from-[#14532d] via-[#3f7d0f] to-[#7ed321]"}`}>
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm text-white/80">
                {b.kind === "savings" ? <PiggyBank className="size-4" aria-hidden /> : <HandCoins className="size-4" aria-hidden />} {b.name}
              </p>
              {isSelf && b.kind === "savings" && <TargetForm accountId={b.account_id} target={b.target_amount} />}
            </div>
            <p className="mt-3 text-3xl font-bold tabular-nums tracking-tight sm:text-4xl">{formatMoney(b.confirmed_balance)}</p>
            <p className="mt-1 text-sm text-white/70">
              {Number(b.pending_in) > 0 && <>+{formatMoney(b.pending_in)} pending · </>}
              {Number(b.pending_out) > 0 && <>−{formatMoney(b.pending_out)} withdrawal pending · </>}
              Confirmed balance
            </p>
            {b.target_amount ? (
              <div className="mt-4">
                <div className="mb-1 flex justify-between text-xs text-white/70"><span>Target {formatMoney(b.target_amount)}</span><span>{percent(b.confirmed_balance, b.target_amount)}%</span></div>
                <Progress value={percent(b.confirmed_balance, b.target_amount)} tone="lime" className="bg-white/15" label={`${b.name} target progress`} />
              </div>
            ) : null}
          </div>
        ))}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Monthly activity" description="Net confirmed amounts per month" icon={<Landmark className="size-4" />} />
            <CardBody>
              <TrendBars data={monthly} xKey="month" valueFormat="money" caption="Net confirmed savings and contributions per month"
                series={[{ key: "savings", label: "Savings", color: "1" }, { key: "contributions", label: "Contributions", color: "2" }]} />
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Payment history" icon={<Receipt className="size-4" />} description="Every entry is permanent. Corrections appear as adjustments or reversals." />
            {rows.length > 0 ? <LedgerTable rows={rows} /> : (
              <EmptyState icon={<Receipt className="size-6" />} title="No entries yet" description="Submit your first deposit or contribution to start your record." />
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {isSelf && isFlutterwaveConfigured() && (
            <Card className="border-2 border-primary/40">
              <CardHeader title="Pay online" icon={<CreditCard className="size-4" />} description="Confirmed instantly. No approval needed." />
              <CardBody><PayOnline purpose="savings" /></CardBody>
            </Card>
          )}
          {isSelf && (
            <Card>
              <CardHeader title={isFlutterwaveConfigured() ? "Or record a bank transfer" : "Submit a payment"} icon={<Plus className="size-4" />} description="An administrator confirms it before it counts." />
              <CardBody><TransactionForm today={today} /></CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Outstanding obligations" icon={<TriangleAlert className="size-4" />} />
            <CardBody className="pt-2">
              {outstanding.length > 0 ? (
                <ul className="divide-y divide-border">
                  {outstanding.map((o) => (
                    <li key={o.id} className="flex items-center justify-between gap-2 py-3">
                      <div>
                        <p className="text-sm font-medium">{o.title}</p>
                        {o.due_date && <p className="text-xs text-fg-subtle">Due {formatDate(o.due_date)}</p>}
                      </div>
                      <span className="font-semibold tabular-nums">{formatMoney(o.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-4 text-center text-sm text-fg-muted">Nothing outstanding. 🎉</p>}
            </CardBody>
          </Card>
          {isSelf && (
            <Card>
              <CardHeader title="Share with leaders" icon={<Share2 className="size-4" />}
                description="Leaders only see your finances if you choose to share. You can stop at any time." />
              <CardBody className="pt-2">
                {(uplines ?? []).length > 0 ? (
                  <ul className="space-y-2">
                    {((uplines ?? []) as { id: string; full_name: string; avatar_url: string | null; member_id: string }[]).map((u) => (
                      <li key={u.id} className="flex items-center gap-3">
                        <Avatar name={u.full_name} src={u.avatar_url} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{u.full_name}</span>
                          <span className="text-xs text-fg-subtle">{u.id === viewer.profile.sponsor_id ? "Sponsor" : "Upline"}</span>
                        </span>
                        {granted.has(u.id) && <Badge tone="green">Shared</Badge>}
                        <ShareToggle viewerId={u.id} shared={granted.has(u.id)} name={u.full_name} />
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-fg-muted">You don&apos;t have a sponsor or upline on record.</p>}
                <p className="mt-3 text-xs text-fg-subtle">Only leaders with the financial-records permission can view shared data.</p>
              </CardBody>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
