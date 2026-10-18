"use client";

import { useActionState, useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { cn } from "@/lib/utils";
import { startOnlinePaymentAction } from "./actions";

/** Pay with card, bank transfer or USSD on Flutterwave's secure page. */
export function PayOnline({ purpose, fixedAmount, officeId }: { purpose: "white_label" | "savings" | "contributions"; fixedAmount?: number; officeId?: string }) {
  const [state, action] = useActionState(startOnlinePaymentAction, null);
  const [kind, setKind] = useState<"savings" | "contributions">(purpose === "contributions" ? "contributions" : "savings");
  const p = purpose === "white_label" ? "white_label" : kind;
  return (
    <form action={action} className="space-y-3">
      <FormMessage state={state} />
      <input type="hidden" name="purpose" value={p} />
      {officeId && <input type="hidden" name="office_id" value={officeId} />}
      {purpose !== "white_label" && (
        <>
          <div className="flex rounded-xl bg-surface-muted p-1 text-sm" role="radiogroup" aria-label="Pay into">
            {(["savings", "contributions"] as const).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)}
                className={cn("flex-1 rounded-lg px-3 py-1.5 font-medium capitalize", kind === k ? "bg-surface shadow-sm" : "text-fg-muted")}>{k}</button>
            ))}
          </div>
          <label className="block text-sm font-medium" htmlFor="pay-amount">Amount (₦)</label>
          <Input id="pay-amount" name="amount" type="number" inputMode="numeric" min={100} max={5000000} step="1" required placeholder="e.g. 5000" className="h-12 text-lg font-semibold" />
        </>
      )}
      <SubmitButton className="h-12 w-full text-base font-semibold" pendingLabel="Opening Flutterwave…">
        <CreditCard className="size-5" aria-hidden /> {fixedAmount ? `Pay ₦${fixedAmount.toLocaleString()} now` : "Pay now"}
      </SubmitButton>
      <p className="flex items-start gap-1.5 text-xs text-fg-subtle">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
        Card, bank transfer or USSD on Flutterwave&apos;s secure page. It&apos;s confirmed automatically, so there&apos;s no receipt to upload.
      </p>
    </form>
  );
}
