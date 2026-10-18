"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Paperclip } from "lucide-react";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { VoiceTextarea } from "@/components/voice";
import { SubmitButton } from "@/components/ui/submit-button";
import { submitTransactionAction } from "./actions";

export function TransactionForm({ today }: { today: string }) {
  const [state, action] = useActionState(submitTransactionAction, null);
  const [kind, setKind] = useState("deposit");
  const [fileName, setFileName] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};

  useEffect(() => {
    if (state?.ok) { formRef.current?.reset(); setFileName(null); setKind("deposit"); setRound((r) => r + 1); }
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="kind" error={e.kind}>
          <Select id="kind" name="kind" value={kind} onChange={(ev) => setKind(ev.target.value)}>
            <option value="deposit">Savings deposit</option>
            <option value="contribution">Contribution</option>
            <option value="withdrawal">Withdrawal request</option>
          </Select>
        </Field>
        <Field label="Account" htmlFor="account" error={e.account}>
          <Select id="account" name="account" key={kind} defaultValue={kind === "contribution" ? "contributions" : "savings"} disabled={kind === "contribution"}>
            <option value="savings">Savings</option>
            <option value="contributions">Contributions</option>
          </Select>
          {kind === "contribution" && <input type="hidden" name="account" value="contributions" />}
        </Field>
        <Field label="Amount" htmlFor="amount" error={e.amount}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle">₦</span>
            <Input id="amount" name="amount" inputMode="decimal" placeholder="0.00" className="pl-8" required />
          </div>
        </Field>
        <Field label="Date paid" htmlFor="occurred_on" error={e.occurred_on}>
          <Input id="occurred_on" name="occurred_on" type="date" max={today} defaultValue={today} />
        </Field>
      </div>
      <Field label="Details" htmlFor="note" optional hint="Type or speak: what this payment is for, bank, reference…">
        <VoiceTextarea key={round} id="note" name="note" rows={3} placeholder="e.g. Transfer from GTBank, ref 12345, my October savings" maxLength={1000} />
      </Field>
      {kind !== "withdrawal" && (
        <Field label="Receipt" htmlFor="receipt" optional error={e.receipt} hint="JPG, PNG, WebP or PDF up to 5 MB. Receipts speed up approval.">
          <label htmlFor="receipt" className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-fg-muted hover:border-primary">
            <Paperclip className="size-4" aria-hidden /> {fileName ?? "Attach a receipt"}
          </label>
          <input id="receipt" name="receipt" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" className="sr-only"
            onChange={(ev) => setFileName(ev.target.files?.[0]?.name ?? null)} />
        </Field>
      )}
      <SubmitButton className="w-full" pendingLabel="Submitting…">
        {kind === "withdrawal" ? "Request withdrawal" : "Submit for approval"}
      </SubmitButton>
    </form>
  );
}
