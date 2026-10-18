import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, BadgeCheck, CreditCard, HandCoins, KeyRound, Landmark, Lock, PiggyBank, Receipt, Send, ShieldCheck, Users } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireViewer } from "@/lib/auth";
import { isFlutterwaveConfigured, listBanks } from "@/lib/flutterwave";
import { createClient } from "@/lib/supabase/server";
import type { AccountBalance } from "@/lib/types";
import { formatDate, formatMoney, todayIn } from "@/lib/utils";
import { PayOnline } from "../payments/pay-online";
import { joinBankWaitlistAction, leaveBankWaitlistAction } from "./actions";
import { MoneyOut, PayoutRow, PinSetup, VaultForm, type Payout } from "./wallet-ui";

export const metadata = { title: "Maximus Bank" };

const LATER = [
  { key: "account", icon: Landmark, title: "Your own account number", text: "A dedicated Naira account number for receiving transfers." },
  { key: "commissions", icon: Users, title: "Earnings paid in-app", text: "Commissions and team payouts straight to your wallet." },
  { key: "bills", icon: Receipt, title: "Airtime, data & bills", text: "Top up and pay bills without leaving the app." },
  { key: "cards", icon: CreditCard, title: "Maximus debit card", text: "Spend your balance anywhere with a Naira card." },
] as const;

type Tx = { id: string; kind: string; direction: number; amount: number; status: string; source: string; occurred_on: string; created_at: string; financial_accounts: { kind: string } | null };

export default async function BankPage() {
  const viewer = await requireViewer();
  const live = isFlutterwaveConfigured();
  const today = todayIn(viewer.profile.timezone);
  const supabase = await createClient();
  const [{ data: balances }, { data: txns }, { data: me }, { data: summary }, { data: payouts }, { data: locks }, banks] = await Promise.all([
    supabase.from("financial_account_balances").select("*").eq("user_id", viewer.id).returns<AccountBalance[]>(),
    supabase.from("financial_transactions").select("id, kind, direction, amount, status, source, occurred_on, created_at, financial_accounts(kind)")
      .eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(15).returns<Tx[]>(),
    supabase.from("bank_waitlist").select("interests").eq("user_id", viewer.id).maybeSingle(),
    supabase.rpc("wallet_summary"),
    supabase.from("payout_requests").select("id, amount, bank_name, account_name, account_number, status, created_at, review_note, provider_message")
      .eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(10).returns<Payout[]>(),
    supabase.from("savings_locks").select("id, amount, unlock_on, reason").eq("user_id", viewer.id).gt("unlock_on", today).order("unlock_on"),
    live ? listBanks() : Promise.resolve([]),
  ]);
  const w = (summary ?? {}) as { savings_available?: number; contributions_available?: number; locked?: number; on_hold?: number; has_pin?: boolean };
  const available = { savings: Number(w.savings_available ?? 0), contributions: Number(w.contributions_available ?? 0) };
  const total = (balances ?? []).reduce((a, b) => a + Number(b.confirmed_balance), 0);
  const pendingIn = (balances ?? []).reduce((a, b) => a + Number(b.pending_in), 0);
  const pendingOut = (balances ?? []).reduce((a, b) => a + Number(b.pending_out), 0);

  return (
    <>
      <PageHeader eyebrow="Maximus Bank" title="Your Maximus wallet" description="Add money, send to any bank or member, withdraw and lock savings. Naira (₦) only." />

      <section className="mb-6 overflow-hidden rounded-[1.75rem] bg-brand-navy p-6 text-white shadow-lg sm:p-8">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-lime px-3 py-1 text-xs font-bold uppercase tracking-wide text-brand-navy">
              {live ? "Live" : "Setting up"}
            </span>
            <p className="mt-4 text-sm text-white/70">Wallet balance</p>
            <p className="text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">{formatMoney(total)}</p>
            <p className="mt-1 text-sm text-white/60">
              {pendingIn > 0 && <>+{formatMoney(pendingIn)} waiting for approval · </>}
              {pendingOut > 0 && <>−{formatMoney(pendingOut)} withdrawal pending · </>}
              Confirmed balance
            </p>
            <p className="mt-3 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-brand-lime px-2.5 py-1 font-semibold text-brand-navy">Available {formatMoney(available.savings + available.contributions)}</span>
              {Number(w.locked ?? 0) > 0 && <span className="rounded-full bg-white/15 px-2.5 py-1"><Lock className="mr-1 inline size-3" aria-hidden />Locked {formatMoney(w.locked)}</span>}
              {Number(w.on_hold ?? 0) > 0 && <span className="rounded-full bg-white/15 px-2.5 py-1">On hold {formatMoney(w.on_hold)}</span>}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(balances ?? []).map((b) => (
              <div key={b.account_id} className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15">
                <p className="flex items-center gap-1.5 text-sm text-white/70">{b.kind === "savings" ? <PiggyBank className="size-4" aria-hidden /> : <HandCoins className="size-4" aria-hidden />}{b.name}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{formatMoney(b.confirmed_balance)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Recent activity" icon={<Receipt className="size-4" />} action={<Link href="/finance" className="text-sm text-primary">All</Link>} />
            <CardBody className="pt-2">
              {(txns ?? []).length === 0 ? (
                <EmptyState icon={<Landmark className="size-6" aria-hidden />} title="No activity yet" description="Add money to your wallet to get started." />
              ) : (
                <ul className="divide-y divide-border">
                  {(txns ?? []).map((t) => (
                    <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                      <span className="flex items-center gap-3">
                        <span className={`grid size-9 place-items-center rounded-xl ${t.direction > 0 ? "bg-success-soft text-success" : "bg-danger-soft text-danger"}`}>
                          {t.direction > 0 ? <ArrowDownLeft className="size-4" aria-hidden /> : <ArrowUpRight className="size-4" aria-hidden />}
                        </span>
                        <span>
                          <span className="block text-sm font-medium capitalize">{t.kind === "deposit" ? "Savings deposit" : t.kind} · {t.financial_accounts?.kind}</span>
                          <span className="text-xs text-fg-subtle">{formatDate(t.occurred_on)}{t.source === "online_payment" ? " · paid online" : ""}</span>
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block font-semibold tabular-nums">{t.direction > 0 ? "+" : "−"}{formatMoney(t.amount)}</span>
                        <Badge tone={t.status === "confirmed" ? "green" : t.status === "pending" ? "amber" : "red"}>{t.status}</Badge>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          {(payouts ?? []).length > 0 && (
            <Card>
              <CardHeader title="Withdrawals & bank transfers" icon={<Send className="size-4" />} />
              <CardBody className="pt-0"><ul className="divide-y divide-border">{(payouts ?? []).map((p) => <PayoutRow key={p.id} p={p} />)}</ul></CardBody>
            </Card>
          )}
          <Card>
            <CardHeader title="Coming next" description="These need extra approvals from our payment partner and a licensed bank." icon={<Landmark className="size-4" />} />
            <CardBody>
              <ul className="grid gap-4 sm:grid-cols-2">
                {LATER.map((f) => (
                  <li key={f.key} className="flex gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><f.icon className="size-5" aria-hidden /></span>
                    <span><span className="block font-semibold">{f.title}</span><span className="text-sm text-fg-muted">{f.text}</span></span>
                  </li>
                ))}
              </ul>
              <form action={me ? leaveBankWaitlistAction : joinBankWaitlistAction} className="mt-4">
                {!me && LATER.map((f) => <input key={f.key} type="hidden" name="interests" value={f.key} />)}
                <SubmitButton size="sm" variant={me ? "ghost" : "outline"} pendingLabel="…">
                  {me ? <><BadgeCheck className="size-4" aria-hidden /> You&apos;ll be told when these launch (tap to stop)</> : "Tell me when these launch"}
                </SubmitButton>
              </form>
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-2 border-primary/40">
            <CardHeader title="Add money" icon={<ArrowDownLeft className="size-4" />}
              description={live ? "Card, bank transfer or USSD. Added instantly once paid." : "Online payments are being switched on."} />
            <CardBody>
              {live ? <PayOnline purpose="savings" /> : (
                <p className="text-sm text-fg-muted">Until then, pay by bank transfer and <Link href="/finance" className="text-primary">record it here</Link>.</p>
              )}
            </CardBody>
          </Card>
          <Card className="border-2 border-primary/40">
            <CardHeader title="Send & withdraw" icon={<ArrowUpRight className="size-4" />} description="To your bank, anyone's bank, or a Maximus member." />
            <CardBody><MoneyOut banks={banks} available={available} hasPin={Boolean(w.has_pin)} transfersOn={live} /></CardBody>
          </Card>
          <Card>
            <CardHeader title={w.has_pin ? "Wallet PIN" : "Set your wallet PIN"} icon={<KeyRound className="size-4" />} />
            <CardBody><PinSetup hasPin={Boolean(w.has_pin)} /></CardBody>
          </Card>
          <Card>
            <CardHeader title="Savings vault" icon={<Lock className="size-4" />} description="Lock money you don't want to touch until a date." />
            <CardBody className="space-y-4">
              {(locks ?? []).length > 0 && (
                <ul className="space-y-2">
                  {(locks ?? []).map((l) => (
                    <li key={l.id as string} className="flex items-center justify-between rounded-xl bg-surface-muted px-3 py-2 text-sm">
                      <span><span className="font-semibold">{formatMoney(l.amount as number)}</span>{l.reason ? ` · ${l.reason}` : ""}</span>
                      <span className="text-xs text-fg-muted">until {formatDate(l.unlock_on as string, { day: "numeric", month: "short", year: "numeric" })}</span>
                    </li>
                  ))}
                </ul>
              )}
              <VaultForm today={today} />
            </CardBody>
          </Card>
          <p className="flex gap-2 px-1 text-xs text-fg-subtle"><ShieldCheck className="size-4 shrink-0" aria-hidden />
            Payments are processed by Flutterwave, a CBN-licensed payment company. Your wallet is a record of what you&apos;ve paid into Maximus. It isn&apos;t a bank deposit account.</p>
        </div>
      </div>
    </>
  );
}
