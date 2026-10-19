"use client";

import { useActionState, useState } from "react";
import { Sparkles } from "lucide-react";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createFormAction } from "./actions";

export function NewFormForm() {
  const [state, action] = useActionState(createFormAction, null);
  const [kind, setKind] = useState<"form" | "survey">("form");
  const [mode, setMode] = useState<"ai" | "blank">("ai");
  const opt = (on: boolean) => `flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${on ? "border-primary bg-primary-soft" : "border-border"}`;
  return (
    <form action={action} className="space-y-4">
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">What are you making?</legend>
        {([["form", "Form", "Orders, sign-ups, bookings, applications"], ["survey", "Survey", "Feedback, ratings, research, polls"]] as const).map(([k, t, d]) => (
          <label key={k} className={opt(kind === k)}><input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} className="mt-1" /><span><b>{t}</b><br /><span className="text-fg-muted">{d}</span></span></label>
        ))}
      </fieldset>
      <Field label="Name" htmlFor="nf-title" hint="Only you see this. Visitors see the heading you set inside."><Input id="nf-title" name="title" maxLength={100} placeholder={kind === "survey" ? "e.g. Customer feedback" : "e.g. Order request"} /></Field>
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">How to start?</legend>
        {([["ai", "Let AI build it", "Describe it and the AI writes the questions."], ["blank", "Start blank", "Add your own questions one by one."]] as const).map(([k, t, d]) => (
          <label key={k} className={opt(mode === k)}><input type="radio" name="mode" value={k} checked={mode === k} onChange={() => setMode(k)} className="mt-1" /><span><b>{t}</b><br /><span className="text-fg-muted">{d}</span></span></label>
        ))}
      </fieldset>
      {mode === "ai" && (
        <Field label="What is it for?" htmlFor="nf-desc" hint="Say who answers it and what you want to learn or collect.">
          <Textarea id="nf-desc" name="description" rows={3} maxLength={1500} placeholder={kind === "survey" ? "e.g. Ask customers who bought my fibre drink how they like it and whether they would order again." : "e.g. Take orders for my fibre drink with delivery address and how many tins they want."} />
        </Field>
      )}
      <FormMessage state={state} />
      <SubmitButton pendingLabel={mode === "ai" ? "AI is building it… (up to a minute)" : "Creating…"}><Sparkles className="size-4" aria-hidden />{mode === "ai" ? "Build it with AI" : "Create"}</SubmitButton>
    </form>
  );
}
