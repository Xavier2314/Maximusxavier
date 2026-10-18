"use client";

import { startTransition, useActionState, useState } from "react";
import { Copy, Lock, Upload } from "lucide-react";
import { shrinkImage } from "@/components/photo-picker";
import { Button } from "@/components/ui/button";
import { FormMessage, Input } from "@/components/ui/form";
import type { WhiteLabelFee, WhiteLabelRequest } from "@/lib/white-label";
import { formatRelative } from "@/lib/utils";
import { submitWhiteLabelAction } from "./white-label-actions";

/**
 * How an office unlocks white-label: pay the one-off fee by transfer, then send the receipt.
 * Not a <form>: it sits inside the branding form, and forms can't be nested.
 */
export function WhiteLabelUnlock({ officeId, fee, latest }: { officeId: string; fee: WhiteLabelFee; latest: WhiteLabelRequest | null }) {
  const [state, dispatch, pending] = useActionState(submitWhiteLabelAction, null);
  const [file, setFile] = useState<File | null>(null);
  const [reference, setReference] = useState("");
  const [copied, setCopied] = useState(false);
  const waiting = latest?.status === "pending" ? latest : null;

  const pick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (f) setFile(await shrinkImage(f, 1600, false).catch(() => f));
  };
  const send = () => {
    if (!file) return;
    const fd = new FormData();
    fd.set("office_id", officeId);
    fd.set("reference", reference);
    fd.set("receipt", file);
    startTransition(() => dispatch(fd));
  };

  if (waiting || state?.ok) {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary-soft/50 p-3 text-sm">
        <FormMessage state={state} />
        {!state?.ok && <p><b>Payment received for checking</b> ({formatRelative(waiting!.created_at)}). We&apos;ll unlock white-label as soon as it&apos;s confirmed.</p>}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface p-4 text-sm">
      <p className="flex items-center gap-2 font-semibold"><Lock className="size-4 text-warning" aria-hidden />Remove &quot;Powered by&quot;: one-off ₦{fee.amount.toLocaleString()}</p>
      {latest?.status === "rejected" && (
        <p className="rounded-lg bg-danger-soft px-3 py-2 text-danger">Last payment wasn&apos;t confirmed{latest.review_note ? `: ${latest.review_note}` : "."} Please check and send again.</p>
      )}
      <ol className="list-decimal space-y-1 pl-5 text-fg-muted">
        <li>Transfer exactly <b className="text-fg">₦{fee.amount.toLocaleString()}</b> to:</li>
      </ol>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-muted p-3">
        <div>
          <p className="font-mono text-lg font-bold tracking-wide">{fee.account_number}</p>
          <p className="text-xs text-fg-muted">{fee.account_name} · {fee.bank}</p>
        </div>
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(fee.account_number).then(() => setCopied(true)).catch(() => {}); }}>
          <Copy className="size-4" aria-hidden />{copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <ol start={2} className="list-decimal space-y-1 pl-5 text-fg-muted">
        <li>Upload a screenshot of the successful transfer. We check the amount and account, then unlock it.</li>
      </ol>
      <FormMessage state={state} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 hover:bg-surface-muted">
          <Upload className="size-4" aria-hidden />{file ? "Change screenshot" : "Choose screenshot"}
          <input type="file" accept="image/*" className="sr-only" onChange={pick} />
        </label>
        {file && <span className="text-xs text-success">Screenshot ready</span>}
      </div>
      <Input value={reference} onChange={(e) => setReference(e.target.value)} maxLength={120} placeholder="Transfer reference or sender name (optional)" aria-label="Transfer reference" />
      <Button onClick={send} disabled={!file || pending}>{pending ? "Sending…" : "Send receipt"}</Button>
    </div>
  );
}
