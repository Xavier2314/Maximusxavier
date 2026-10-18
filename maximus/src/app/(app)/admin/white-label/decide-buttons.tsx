"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { decideWhiteLabelAction } from "../../office/brand/white-label-actions";

export function DecideButtons({ id }: { id: string }) {
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const decide = (approve: boolean) => {
    if (approve && !confirm("Approve? Only do this after you've seen the money in your account.")) return;
    start(async () => setMsg(await decideWhiteLabelAction(id, approve, note)));
  };
  return (
    <div className="space-y-2">
      <Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note to the office (needed if you reject)" aria-label="Note" />
      <div className="flex gap-2">
        <Button onClick={() => decide(true)} disabled={pending} variant="success"><Check className="size-4" aria-hidden />Approve</Button>
        <Button onClick={() => decide(false)} disabled={pending || note.trim().length < 3} variant="outline" className="text-danger"><X className="size-4" aria-hidden />Reject</Button>
      </div>
      {msg && <p role="status" className={msg.ok ? "text-sm text-success" : "text-sm text-danger"}>{msg.message}</p>}
    </div>
  );
}
