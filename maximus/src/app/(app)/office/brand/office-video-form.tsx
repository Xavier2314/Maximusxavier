"use client";

import { useActionState } from "react";
import { Checkbox, Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { videoShareLink, type FeaturedVideo } from "@/lib/featured";
import { saveOfficeVideoAction } from "./video-actions";

export function OfficeVideoForm({ officeId, current }: { officeId: string; current: FeaturedVideo | null }) {
  const [state, action] = useActionState(saveOfficeVideoAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="office_id" value={officeId} />
      <Field label="YouTube or Loom link" htmlFor="ov-url">
        <Input id="ov-url" name="url" required inputMode="url" autoComplete="off" defaultValue={current ? videoShareLink(current) : ""}
          placeholder="https://youtu.be/… or https://www.loom.com/share/…" />
      </Field>
      <Field label="Title" htmlFor="ov-title"><Input id="ov-title" name="title" required maxLength={120} defaultValue={current?.title ?? ""} /></Field>
      <Field label="Short message (optional)" htmlFor="ov-msg"><Textarea id="ov-msg" name="message" rows={2} maxLength={300} defaultValue={current?.message ?? ""} /></Field>
      <label className="flex items-center gap-2 text-sm"><Checkbox name="popup" defaultChecked={current?.popup ?? true} /> Pop it up once for each member</label>
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="intent" value="save" pendingLabel="Saving…">Show to my members</SubmitButton>
        {current && <SubmitButton name="intent" value="remove" formNoValidate variant="outline" pendingLabel="Removing…">Remove video</SubmitButton>}
      </div>
    </form>
  );
}
