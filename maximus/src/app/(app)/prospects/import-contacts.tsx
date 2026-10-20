"use client";

import { useActionState, useState } from "react";
import { FileUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { importContactsAction } from "./actions";

export function ImportContacts() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(importContactsAction, null);
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><FileUp className="size-4" aria-hidden /> Import</Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 backdrop-blur-sm animate-fade sm:place-items-center sm:p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="imp-title" onClick={(e) => e.stopPropagation()} className="card max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-b-none p-6 animate-rise sm:rounded-b-[var(--radius-card)] safe-bottom">
            <div className="mb-3 flex items-center justify-between">
              <h2 id="imp-title" className="text-lg font-bold">Import contacts</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-9 place-items-center rounded-lg hover:bg-surface-muted"><X className="size-5" /></button>
            </div>
            <p className="mb-3 text-sm text-fg-muted">Upload a CSV from Excel or Google Sheets. The first row must have column names such as <b>Name</b>, <b>Phone</b>, <b>Email</b>, <b>Tags</b>, <b>Notes</b>. People already in your list are updated, not repeated.</p>
            <form action={action} className="space-y-4">
              <Field label="CSV file" htmlFor="imp-file"><input id="imp-file" name="file" type="file" accept=".csv,text/csv,text/plain" className="block w-full text-sm" /></Field>
              <Field label="Or paste your list" htmlFor="imp-text"><Textarea id="imp-text" name="text" rows={5} className="font-mono text-xs" placeholder={"Name,Phone,Email\nAda Obi,08031234567,ada@example.com"} /></Field>
              <Field label="Add a tag to everyone (optional)" htmlFor="imp-tag" hint="For example the event or list name."><Input id="imp-tag" name="tag" maxLength={30} placeholder="e.g. expo-2026" /></Field>
              <FormMessage state={state} />
              <SubmitButton className="w-full" pendingLabel="Importing…">Import contacts</SubmitButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
