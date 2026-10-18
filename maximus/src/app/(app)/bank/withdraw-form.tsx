"use client";

import { useActionState, useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Field, FormMessage, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { safeAction } from "@/lib/report-error";
import { submitTransactionAction } from "../finance/actions";

const safeSubmit = safeAction(submitTransactionAction, { ok: false, message: "Couldn't send the request. Refresh the page and try again." });

/** Ask to withdraw to your own bank account. An administrator approves and pays it out. */
export function WithdrawForm({ today }: { today: string }) {
  const [state, action] = useActionState(safeSubmit, null);
  const [bank, setBank] = useState("");
  const [number, setNumber] = useState("");
  const [name, setName] = useState("");
  return (
    <form action={action} className="space-y-3" autoComplete="off">
      <FormMessage state={state} />
      <input type="hidden" name="kind" value="withdrawal" />
      <input type="hidden" name="occurred_on" value={today} />
      <input type="hidden" name="note" value={`Pay to: ${name} · ${number} · ${bank}`} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="From" htmlFor="w-account">
          <Select id="w-account" name="account" defaultValue="savings">
            <option value="savings">Savings</option>
            <option value="contributions">Contributions</option>
          </Select>
        </Field>
        <Field label="Amount (₦)" htmlFor="w-amount">
          <Input id="w-amount" name="amount" inputMode="decimal" required placeholder="0" />
        </Field>
      </div>
      <Field label="Your bank" htmlFor="w-bank">
        <Input id="w-bank" value={bank} onChange={(e) => setBank(e.target.value)} required maxLength={60} placeholder="e.g. First Bank" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Account number" htmlFor="w-number">
          <Input id="w-number" value={number} onChange={(e) => setNumber(e.target.value.replace(/\D/g, "").slice(0, 10))} required inputMode="numeric" placeholder="10 digits" />
        </Field>
        <Field label="Account name" htmlFor="w-name">
          <Input id="w-name" value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </Field>
      </div>
      <SubmitButton className="h-11 w-full" variant="outline" pendingLabel="Sending…" disabled={number.length !== 10 || !bank || !name}>
        <ArrowUpRight className="size-4" aria-hidden /> Request withdrawal
      </SubmitButton>
      <p className="text-xs text-fg-subtle">Withdrawals are checked and paid by an administrator, usually within 1 to 2 working days.</p>
    </form>
  );
}
