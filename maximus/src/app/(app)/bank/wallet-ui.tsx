"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { BadgeCheck, Building2, KeyRound, Lock, Send, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { SubmitButton } from "@/components/ui/submit-button";
import { safeAction } from "@/lib/report-error";
import { cn, formatMoney, formatRelative } from "@/lib/utils";
import {
  cancelPayoutAction, checkAccountAction, lockSavingsAction, memberNameAction, requestPayoutAction, sendToMemberAction, setPinAction,
} from "./wallet-actions";

const FAIL = { ok: false, message: "Couldn't complete that. Refresh the page and try again." };
const safeSetPin = safeAction(setPinAction, FAIL);
const safeRequestPayout = safeAction(requestPayoutAction, FAIL);
const safeSendToMember = safeAction(sendToMemberAction, FAIL);
const safeLock = safeAction(lockSavingsAction, FAIL);

export type Bank = { code: string; name: string };

function PinInput({ name = "pin", label = "Wallet PIN" }: { name?: string; label?: string }) {
  return (
    <Field label={label} htmlFor={`pin-${name}`}>
      <Input id={`pin-${name}`} name={name} type="password" inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="off"
        placeholder="••••" className="h-12 w-32 text-center text-xl tracking-[0.5em]" />
    </Field>
  );
}

export function PinSetup({ hasPin }: { hasPin: boolean }) {
  const [state, action] = useActionState(safeSetPin, null);
  const [open, setOpen] = useState(!hasPin);
  if (!open) return <Button variant="ghost" size="sm" onClick={() => setOpen(true)}><KeyRound className="size-4" aria-hidden /> Change PIN</Button>;
  return (
    <form action={action} className="space-y-3" autoComplete="off">
      <FormMessage state={state} />
      {!hasPin && <p className="text-sm text-fg-muted">Set a 4-digit PIN. You&apos;ll need it to send or withdraw money.</p>}
      <div className="flex flex-wrap gap-3">
        {hasPin && <PinInput name="old" label="Current PIN" />}
        <PinInput name="pin" label={hasPin ? "New PIN" : "New PIN"} />
        <PinInput name="confirm" label="Repeat PIN" />
      </div>
      <SubmitButton pendingLabel="Saving…"><KeyRound className="size-4" aria-hidden /> Save PIN</SubmitButton>
    </form>
  );
}

/** Withdraw to your own bank, pay any bank account, or send to a Maximus member. */
export function MoneyOut({ banks, available, hasPin, transfersOn }: {
  banks: Bank[]; available: { savings: number; contributions: number }; hasPin: boolean; transfersOn: boolean;
}) {
  const [tab, setTab] = useState<"self" | "other" | "member">(transfersOn ? "self" : "member");
  if (!hasPin) return <p className="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">Set your wallet PIN above first.</p>;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-surface-muted p-1 text-sm" role="tablist">
        {([["self", "My bank", Building2], ["other", "Other bank", Send], ["member", "Maximus member", UserRound]] as const).map(([k, l, I]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
            className={cn("flex items-center justify-center gap-1.5 rounded-lg px-2 py-2 font-medium", tab === k ? "bg-surface shadow-sm" : "text-fg-muted")}>
            <I className="size-4 shrink-0" aria-hidden /><span className="truncate">{l}</span>
          </button>
        ))}
      </div>
      {tab === "member" ? <ToMember available={available} /> : transfersOn
        ? <ToBank key={tab} banks={banks} self={tab === "self"} available={available} />
        : <p className="text-sm text-fg-muted">Bank transfers will be available once online payments are switched on.</p>}
    </div>
  );
}

function AccountPicker({ available }: { available: { savings: number; contributions: number } }) {
  return (
    <Field label="From" htmlFor="out-account">
      <Select id="out-account" name="account" defaultValue="savings">
        <option value="savings">Savings · {formatMoney(available.savings)} available</option>
        <option value="contributions">Contributions · {formatMoney(available.contributions)} available</option>
      </Select>
    </Field>
  );
}

function ToBank({ banks, self, available }: { banks: Bank[]; self: boolean; available: { savings: number; contributions: number } }) {
  const [state, action] = useActionState(safeRequestPayout, null);
  const [bank, setBank] = useState("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState<string | null>(null);
  const [checkMsg, setCheckMsg] = useState<string | null>(null);
  const [checking, start] = useTransition();
  const bankName = banks.find((b) => b.code === bank)?.name ?? "";

  useEffect(() => {
    setName(null); setCheckMsg(null);
    if (number.length !== 10 || !bank) return;
    start(async () => {
      const r = await checkAccountAction(number, bank);
      if (r.ok) setName(r.name ?? null); else setCheckMsg(r.message ?? null);
    });
  }, [number, bank]);

  useEffect(() => { if (state?.ok) { setNumber(""); setName(null); } }, [state]);

  return (
    <form action={action} className="space-y-3" autoComplete="off">
      <FormMessage state={state} />
      <input type="hidden" name="recipient_type" value={self ? "self" : "other"} />
      <input type="hidden" name="bank_name" value={bankName} />
      <AccountPicker available={available} />
      <Field label="Bank" htmlFor="out-bank">
        <Select id="out-bank" name="bank_code" value={bank} onChange={(e) => setBank(e.target.value)} required>
          <option value="">Choose bank…</option>
          {banks.map((b) => <option key={`${b.code}-${b.name}`} value={b.code}>{b.name}</option>)}
        </Select>
      </Field>
      <Field label={self ? "Your account number" : "Their account number"} htmlFor="out-number">
        <Input id="out-number" name="account_number" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 10))}
          inputMode="numeric" required placeholder="10 digits" />
      </Field>
      {checking && <p className="text-sm text-fg-muted">Checking the account…</p>}
      {name && <p className="flex items-center gap-1.5 rounded-xl bg-success-soft px-3 py-2 text-sm font-semibold text-success"><BadgeCheck className="size-4" aria-hidden /> {name}</p>}
      {checkMsg && <p className="text-sm text-danger">{checkMsg}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₦)" htmlFor="out-amount"><Input id="out-amount" name="amount" inputMode="decimal" required placeholder="0" /></Field>
        <Field label="Note" htmlFor="out-note" optional><Input id="out-note" name="narration" maxLength={60} placeholder="e.g. Rent" /></Field>
      </div>
      <PinInput />
      <SubmitButton className="h-12 w-full text-base font-semibold" pendingLabel="Sending request…" disabled={!name}>
        <Send className="size-4" aria-hidden /> {self ? "Withdraw" : "Send"}
      </SubmitButton>
      <p className="text-xs text-fg-subtle">The amount is held in your wallet straight away. It leaves only when an approver sends it and the bank confirms; if anything fails it comes back.</p>
    </form>
  );
}

function ToMember({ available }: { available: { savings: number; contributions: number } }) {
  const [state, action] = useActionState(safeSendToMember, null);
  const [code, setCode] = useState("");
  const [who, setWho] = useState<string | null>(null);
  const [, start] = useTransition();
  useEffect(() => {
    setWho(null);
    if (code.trim().length < 5) return;
    const t = setTimeout(() => start(async () => setWho(await memberNameAction(code))), 400);
    return () => clearTimeout(t);
  }, [code]);
  useEffect(() => { if (state?.ok) { setCode(""); setWho(null); } }, [state]);
  return (
    <form action={action} className="space-y-3" autoComplete="off">
      <FormMessage state={state} />
      <AccountPicker available={available} />
      <Field label="Their Maximus ID" htmlFor="m-code">
        <Input id="m-code" name="code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} required placeholder="e.g. MX-001234" />
      </Field>
      {who && <p className="flex items-center gap-1.5 rounded-xl bg-success-soft px-3 py-2 text-sm font-semibold text-success"><BadgeCheck className="size-4" aria-hidden /> {who}</p>}
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₦)" htmlFor="m-amount"><Input id="m-amount" name="amount" inputMode="decimal" required placeholder="0" /></Field>
        <Field label="Note" htmlFor="m-note" optional><Input id="m-note" name="note" maxLength={100} /></Field>
      </div>
      <PinInput />
      <SubmitButton className="h-12 w-full text-base font-semibold" pendingLabel="Sending…" disabled={!who}>
        <Send className="size-4" aria-hidden /> Send instantly
      </SubmitButton>
      <p className="text-xs text-fg-subtle">Arrives in their savings straight away. Free. Up to ₦500,000 a day.</p>
    </form>
  );
}

export function VaultForm({ today }: { today: string }) {
  const [state, action] = useActionState(safeLock, null);
  const minDate = new Date(`${today}T12:00:00Z`); minDate.setUTCDate(minDate.getUTCDate() + 1);
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount (₦)" htmlFor="v-amount"><Input id="v-amount" name="amount" inputMode="decimal" required placeholder="0" /></Field>
        <Field label="Unlock on" htmlFor="v-date"><Input id="v-date" name="unlock_on" type="date" required min={minDate.toISOString().slice(0, 10)} /></Field>
      </div>
      <Field label="What it's for" htmlFor="v-reason" optional><Input id="v-reason" name="reason" maxLength={120} placeholder="e.g. School fees, rent, business stock" /></Field>
      <SubmitButton className="w-full" pendingLabel="Locking…"><Lock className="size-4" aria-hidden /> Lock it</SubmitButton>
      <p className="text-xs text-fg-subtle">Locked money stays in your savings but can&apos;t be withdrawn or sent until the unlock date. It can&apos;t be unlocked early.</p>
    </form>
  );
}

export type Payout = { id: string; amount: number; bank_name: string; account_name: string; account_number: string; status: string; created_at: string; review_note: string | null; provider_message: string | null };
const TONE: Record<string, "amber" | "blue" | "green" | "red" | "neutral"> = { pending: "amber", approved: "blue", processing: "blue", successful: "green", failed: "red", rejected: "red", cancelled: "neutral" };
const LABEL: Record<string, string> = { pending: "Waiting for approval", approved: "Approved, sending", processing: "Sending", successful: "Sent", failed: "Failed, refunded", rejected: "Not approved", cancelled: "Cancelled" };

export function PayoutRow({ p }: { p: Payout }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <li className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
      <span>
        <span className="block font-medium">{formatMoney(p.amount)} → {p.account_name}</span>
        <span className="text-xs text-fg-subtle">{p.bank_name} · ••{p.account_number.slice(-4)} · {formatRelative(p.created_at)}</span>
        {(p.review_note || (p.status === "failed" && p.provider_message)) && <span className="block text-xs text-fg-muted">{p.review_note ?? p.provider_message}</span>}
        {msg && <span className="block text-xs text-fg-muted">{msg}</span>}
      </span>
      <span className="flex items-center gap-2">
        <Badge tone={TONE[p.status] ?? "neutral"}>{LABEL[p.status] ?? p.status}</Badge>
        {p.status === "pending" && (
          <Button size="icon" variant="ghost" className="size-8" aria-label="Cancel request" disabled={pending}
            onClick={() => start(async () => { const r = await cancelPayoutAction(p.id); setMsg(r.message); })}><X className="size-4" aria-hidden /></Button>
        )}
      </span>
    </li>
  );
}
