"use client";

import { useState, useTransition } from "react";
import { Check, RefreshCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { approvePayoutAction, refreshPayoutAction, rejectPayoutAction } from "./actions";

export function PayoutDecision({ id, label }: { id: string; label: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="success" disabled={pending}
          onClick={() => { if (confirm(`Send ${label} now? Money will leave your Flutterwave balance.`)) start(async () => setMsg((await approvePayoutAction(id)).message)); }}>
          <Check className="size-4" aria-hidden /> Approve & send
        </Button>
        <Button size="sm" variant="ghost" disabled={pending}
          onClick={() => { const n = prompt("Reason for rejecting (the member will see this):") ?? ""; if (n !== null) start(async () => setMsg((await rejectPayoutAction(id, n)).message)); }}>
          <X className="size-4" aria-hidden /> Reject
        </Button>
      </div>
      {msg && <p className="text-xs text-fg-muted" role="status">{msg}</p>}
    </div>
  );
}

export function PayoutRefresh({ reference, transferId }: { reference: string; transferId: number | null }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <Button size="sm" variant="outline" disabled={pending} onClick={() => start(async () => setMsg((await refreshPayoutAction(reference, transferId)).message))}>
        <RefreshCw className="size-4" aria-hidden /> Check status
      </Button>
      {msg && <span className="text-xs text-fg-muted">{msg}</span>}
    </span>
  );
}
