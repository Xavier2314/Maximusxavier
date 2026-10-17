"use client";

import { useActionState, useEffect, useState } from "react";
import { Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { requestCorrectionAction } from "./actions";

function tzOffset() {
  const m = -new Date().getTimezoneOffset();
  const sign = m >= 0 ? "+" : "-";
  const a = Math.abs(m);
  return `${sign}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
}

export function CorrectionForm({ offices, today }: { offices: { id: string; name: string }[]; today: string }) {
  const [state, action] = useActionState(requestCorrectionAction, null);
  const [offset, setOffset] = useState("+01:00");
  useEffect(() => setOffset(tzOffset()), []);
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state ? { ok: state.ok, message: state.message } : null} />
      <input type="hidden" name="tz_offset" value={offset} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Office" htmlFor="c-office" error={e.office_id}>
          <Select id="c-office" name="office_id" defaultValue={offices[0]?.id}>
            {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
        <Field label="Date" htmlFor="c-date" error={e.date}>
          <Input id="c-date" name="date" type="date" max={today} defaultValue={today} required />
        </Field>
        <Field label="Arrived at" htmlFor="c-in" optional error={e.check_in}>
          <Input id="c-in" name="check_in" type="time" />
        </Field>
        <Field label="Left at" htmlFor="c-out" optional error={e.check_out}>
          <Input id="c-out" name="check_out" type="time" />
        </Field>
      </div>
      <Field label="What happened?" htmlFor="c-reason" error={e.reason} hint="e.g. My phone's location was off, or I forgot to check in.">
        <Textarea id="c-reason" name="reason" required minLength={5} maxLength={1000} />
      </Field>
      <SubmitButton pendingLabel="Sending…">Send request</SubmitButton>
    </form>
  );
}
