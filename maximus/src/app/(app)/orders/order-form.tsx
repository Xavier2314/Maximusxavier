"use client";

import { useActionState, useEffect, useRef } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { recordOrderAction } from "./actions";

export const CATEGORIES = ["Wellness", "Nutrition", "Personal care", "Beauty", "Home care", "Accessories", "Other"];

export function OrderForm({ members, selfId, today }: { members: { id: string; name: string }[]; selfId: string; today: string }) {
  const [state, action] = useActionState(recordOrderAction, null);
  const ref = useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {members.length > 0 ? (
        <Field label="Attributed to" htmlFor="member_id" error={e.member_id}>
          <Select id="member_id" name="member_id" defaultValue={selfId}>
            <option value={selfId}>Me</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </Field>
      ) : <input type="hidden" name="member_id" value={selfId} />}
      <Field label="Customer" htmlFor="customer_name" optional>
        <Input id="customer_name" name="customer_name" placeholder="Customer or member name" maxLength={120} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Order amount" htmlFor="amount" error={e.amount}>
          <div className="relative">
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-fg-subtle">₦</span>
            <Input id="amount" name="amount" inputMode="decimal" placeholder="0" className="pl-8" required />
          </div>
        </Field>
        <Field label="Business volume" htmlFor="business_volume" optional error={e.business_volume}>
          <Input id="business_volume" name="business_volume" inputMode="decimal" placeholder="BV" />
        </Field>
        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" defaultValue="">
            <option value="">Choose…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
        </Field>
        <Field label="Status" htmlFor="status">
          <Select id="status" name="status" defaultValue="pending">
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="delivered">Delivered</option>
          </Select>
        </Field>
        <Field label="Order date" htmlFor="order_date" error={e.order_date}>
          <Input id="order_date" name="order_date" type="date" max={today} defaultValue={today} />
        </Field>
      </div>
      <Field label="Notes" htmlFor="notes" optional>
        <Textarea id="notes" name="notes" rows={2} maxLength={1000} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Saving…">Record order</SubmitButton>
    </form>
  );
}
