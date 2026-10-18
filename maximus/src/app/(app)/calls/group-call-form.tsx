"use client";

import { useActionState } from "react";
import { Checkbox, Field, FormMessage, Input, Select } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { startGroupCallAction } from "./actions";

export function GroupCallForm({ offices }: { offices: { id: string; name: string }[] }) {
  const [state, action] = useActionState(startGroupCallAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      {offices.length > 1 ? (
        <Field label="Office" htmlFor="office_id">
          <Select id="office_id" name="office_id" required defaultValue="">
            <option value="" disabled>Choose an office</option>
            {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
      ) : <input type="hidden" name="office_id" value={offices[0].id} />}
      <Field label="Call title" htmlFor="title">
        <Input id="title" name="title" maxLength={120} placeholder="e.g. Monday morning rally" />
      </Field>
      <label className="flex items-center gap-2 text-sm"><Checkbox name="video" defaultChecked /> Video on</label>
      <SubmitButton className="w-full" pendingLabel="Starting…">Start call now</SubmitButton>
    </form>
  );
}
