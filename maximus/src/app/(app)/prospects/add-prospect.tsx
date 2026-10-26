"use client";

import { useActionState, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createProspectAction } from "./actions";
import { ProspectFields } from "./prospect-fields";

export function AddProspect() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(createProspectAction, null);
  return (
    <>
      <Button onClick={() => setOpen(true)}><UserPlus className="size-4" aria-hidden /> Add prospect</Button>
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/50 animate-fade sm:place-items-center sm:p-4" onClick={() => setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="add-prospect-title" onClick={(e) => e.stopPropagation()}
            className="card max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-b-none p-6 animate-rise sm:rounded-b-[var(--radius-card)] safe-bottom">
            <div className="mb-4 flex items-center justify-between">
              <h2 id="add-prospect-title" className="text-lg font-bold">Add a prospect</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid size-11 place-items-center rounded-lg hover:bg-surface-muted"><X className="size-5" /></button>
            </div>
            <form action={action} className="space-y-4">
              <FormMessage state={state} />
              <ProspectFields errors={state?.errors} />
              <SubmitButton className="w-full" pendingLabel="Adding…">Add prospect</SubmitButton>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
