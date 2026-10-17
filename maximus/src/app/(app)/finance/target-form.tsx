"use client";

import { useActionState, useState } from "react";
import { Target } from "lucide-react";
import { SubmitButton } from "@/components/ui/submit-button";
import { setSavingsTargetAction } from "./actions";

export function TargetForm({ accountId, target }: { accountId: string; target: number | null }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(async (prev: Awaited<ReturnType<typeof setSavingsTargetAction>>, fd: FormData) => {
    const r = await setSavingsTargetAction(prev, fd);
    if (r?.ok) setOpen(false);
    return r;
  }, null);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2.5 py-1 text-xs ring-1 ring-white/20 hover:bg-white/15">
        <Target className="size-3.5" aria-hidden /> {target ? "Edit target" : "Set target"}
      </button>
    );
  }
  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="account_id" value={accountId} />
      <input name="target_amount" inputMode="numeric" defaultValue={target ?? ""} placeholder="Target ₦" aria-label="Savings target"
        className="h-8 w-28 rounded-lg border border-white/25 bg-white/10 px-2 text-sm text-white placeholder:text-white/50" autoFocus />
      <SubmitButton size="sm" variant="lime" className="h-8">Save</SubmitButton>
      {state && !state.ok && <span className="text-xs text-white" role="alert">{state.message}</span>}
    </form>
  );
}
