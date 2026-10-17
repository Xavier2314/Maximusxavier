"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { reviewCorrectionAction } from "../../attendance/actions";
import { decideTransactionAction, recordAdjustmentAction } from "../../finance/actions";

function Decision({ onDecide }: { onDecide: (approve: boolean, note?: string) => Promise<{ ok: boolean; message: string }> }) {
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  if (result?.ok) return <p className="text-sm font-medium text-success" role="status">{result.message}</p>;
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button size="sm" variant="success" disabled={pending} onClick={() => start(async () => setResult(await onDecide(true)))}>
          <Check className="size-4" aria-hidden /> Approve
        </Button>
        <Button size="sm" variant="outline" disabled={pending}
          onClick={() => { const reason = prompt("Reason for rejecting (shared with the member):") ?? undefined; if (reason !== undefined) start(async () => setResult(await onDecide(false, reason))); }}>
          <X className="size-4" aria-hidden /> Reject
        </Button>
      </div>
      {result && !result.ok && <p className="text-xs text-danger" role="alert">{result.message}</p>}
    </div>
  );
}

export function PaymentDecision({ id }: { id: string }) {
  return <Decision onDecide={(approve, note) => decideTransactionAction(id, approve, note)} />;
}

export function CorrectionDecision({ id }: { id: string }) {
  return <Decision onDecide={(approve, note) => reviewCorrectionAction(id, approve, note)} />;
}

export function AdjustmentForm() {
  const [state, action] = useActionState(recordAdjustmentAction, null);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="Member ID" htmlFor="adj-member" error={e.member_code}><Input id="adj-member" name="member_code" placeholder="MX-001024" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Account" htmlFor="adj-account"><Select id="adj-account" name="account"><option value="savings">Savings</option><option value="contributions">Contributions</option></Select></Field>
        <Field label="Direction" htmlFor="adj-dir"><Select id="adj-dir" name="direction"><option value="1">Credit (+)</option><option value="-1">Debit (−)</option></Select></Field>
      </div>
      <Field label="Amount" htmlFor="adj-amount" error={e.amount}><Input id="adj-amount" name="amount" inputMode="decimal" placeholder="0.00" /></Field>
      <Field label="Reason" htmlFor="adj-note" error={e.note}><Textarea id="adj-note" name="note" rows={2} placeholder="Why is this adjustment needed?" /></Field>
      <SubmitButton className="w-full" variant="secondary" pendingLabel="Recording…">Record adjustment</SubmitButton>
    </form>
  );
}
