"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage, Select } from "@/components/ui/form";
import { VoiceTextarea } from "@/components/voice";
import { submitComplaintAction } from "@/app/(app)/support/actions";
import { COMPLAINT_CATEGORIES } from "@/lib/support";

/** Make a complaint or report a problem: type or speak it. */
export function ComplaintForm({ page, compact = false }: { page?: string; compact?: boolean }) {
  const [category, setCategory] = useState("other");
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  const send = () => start(async () => {
    const r = await submitComplaintAction({ category: category as (typeof COMPLAINT_CATEGORIES)[number]["value"], message, page });
    setNotice(r);
    if (r.ok) setMessage("");
  });
  return (
    <div className="space-y-3">
      <FormMessage state={notice} />
      <Select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="What is it about?">
        {COMPLAINT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
      </Select>
      <VoiceTextarea value={message} onValueChange={setMessage} rows={compact ? 3 : 5} maxLength={4000} aria-label="Your complaint"
        placeholder="What happened? Type or tap Speak. Include dates, amounts or names if they help." />
      <Button className="w-full" onClick={send} disabled={pending || message.trim().length < 5}>
        <Send className="size-4" aria-hidden />{pending ? "Sending…" : "Send to the admin team"}
      </Button>
    </div>
  );
}
