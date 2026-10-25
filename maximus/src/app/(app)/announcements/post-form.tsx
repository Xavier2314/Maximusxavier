"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { publishAction } from "./actions";

type Option = { id: string; name: string };

export function PostForm({ mode, offices, members, canOrgWide, canTeam = true }: {
  mode: "announcement" | "recognition"; offices: Option[]; members: Option[]; canOrgWide: boolean; canTeam?: boolean;
}) {
  const [state, action] = useActionState(publishAction, null);
  const [audience, setAudience] = useState(mode === "recognition" ? "team" : canOrgWide ? "all" : canTeam ? "team" : "office");
  const ref = useRef<HTMLFormElement>(null);
  const e = state?.errors ?? {};
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);

  return (
    <form ref={ref} action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {mode === "recognition" ? (
        <>
          <input type="hidden" name="kind" value="recognition" />
          <input type="hidden" name="audience" value="team" />
          <Field label="Who are you recognising?" htmlFor="recipient_id" error={e.recipient_id}>
            <Select id="recipient_id" name="recipient_id" defaultValue="">
              <option value="" disabled>Choose a team member</option>
              {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </Select>
          </Field>
        </>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Type" htmlFor="kind">
            <Select id="kind" name="kind" defaultValue="announcement">
              <option value="announcement">Announcement</option>
              <option value="training">Training</option>
            </Select>
          </Field>
          <Field label="Audience" htmlFor="audience">
            <Select id="audience" name="audience" value={audience} onChange={(ev) => setAudience(ev.target.value)}>
              {canOrgWide && <option value="all">Everyone</option>}
              {offices.length > 0 && <option value="office">One office</option>}
              {canTeam && <option value="team">My team</option>}
            </Select>
          </Field>
          {audience === "office" && (
            <Field label="Office" htmlFor="office_id" error={e.office_id} className="sm:col-span-2">
              <Select id="office_id" name="office_id" defaultValue={offices[0]?.id}>
                {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </Select>
            </Field>
          )}
        </div>
      )}
      <Field label="Title" htmlFor="title" error={e.title}>
        <Input id="title" name="title" maxLength={160} placeholder={mode === "recognition" ? "e.g. Ada hit her sales target!" : "e.g. Director Seminar this Thursday"} />
      </Field>
      <Field label="Message" htmlFor="body" error={e.body}>
        <Textarea id="body" name="body" rows={4} maxLength={5000} />
      </Field>
      {mode === "announcement" && (
        <label className="flex items-center gap-2 text-sm"><Checkbox name="pinned" className="size-4" /> Pin to the top</label>
      )}
      <SubmitButton className="w-full" pendingLabel="Publishing…">{mode === "recognition" ? "Post recognition" : "Publish"}</SubmitButton>
    </form>
  );
}
