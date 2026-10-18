"use client";

import { useActionState } from "react";
import { Checkbox, Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { FeaturedVideo } from "@/lib/featured";
import { saveFeaturedVideoAction } from "./actions";

export function FeaturedVideoForm({ current }: { current: FeaturedVideo | null }) {
  const [state, action] = useActionState(saveFeaturedVideoAction, null);
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="YouTube link" htmlFor="url">
        <Input id="url" name="url" required inputMode="url" autoComplete="off" placeholder="https://youtu.be/…"
          defaultValue={current ? `https://youtu.be/${current.youtube_id}` : ""} />
      </Field>
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required maxLength={120} defaultValue={current?.title ?? ""} placeholder="e.g. This week's training" />
      </Field>
      <Field label="Short message (optional)" htmlFor="message">
        <Textarea id="message" name="message" maxLength={300} rows={2} defaultValue={current?.message ?? ""} placeholder="Everyone must watch this before Monday!" />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox name="popup" defaultChecked={current?.popup ?? true} className="mt-0.5" />
        <span><b>Pop it up</b> — show it as a pop-up once to everyone when they next open the app.</span>
      </label>
      <div className="flex flex-wrap gap-2">
        <SubmitButton name="intent" value="save" pendingLabel="Saving…">Show to everyone</SubmitButton>
        {current && <SubmitButton name="intent" value="remove" formNoValidate variant="outline" pendingLabel="Hiding…">Hide video</SubmitButton>}
      </div>
    </form>
  );
}
