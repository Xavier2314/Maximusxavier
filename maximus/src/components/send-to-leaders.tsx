"use client";

import { useState, useTransition } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { Avatar } from "@/components/ui/misc";
import { VoiceTextarea } from "@/components/voice";
import { shareWithLeadersAction } from "@/app/(app)/inbox/actions";

export type Leader = { relation: "sponsor" | "team_leader"; id: string; full_name: string; avatar_url: string | null };

/** "Send to my sponsor / team leader" with an optional typed or spoken note. */
export function SendToLeaders({ leaders, kind, itemId, title, body, attachment }: {
  leaders: Leader[]; kind: "goal" | "evaluation" | "order" | "payment" | "plan";
  itemId: string | null; title: string; body: string; attachment?: string | null;
}) {
  const [picked, setPicked] = useState<string[]>(leaders.map((l) => l.relation));
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  if (leaders.length === 0) {
    return <p className="text-sm text-fg-muted">You don&apos;t have a sponsor or team leader on record yet. An administrator can set this.</p>;
  }
  const toggle = (r: string) => setPicked((p) => (p.includes(r) ? p.filter((x) => x !== r) : [...p, r]));
  const send = () => start(async () => {
    const r = await shareWithLeadersAction({ kind, itemId, title, body, relations: picked as Leader["relation"][], message, attachment: attachment ?? null });
    setNotice(r);
    if (r.ok) setMessage("");
  });
  return (
    <div className="space-y-3">
      <FormMessage state={notice} />
      <div className="flex flex-wrap gap-2">
        {leaders.map((l) => (
          <label key={l.relation} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary-soft/50">
            <input type="checkbox" checked={picked.includes(l.relation)} onChange={() => toggle(l.relation)} className="size-4 accent-[var(--primary)]" />
            <Avatar name={l.full_name} src={l.avatar_url} size={26} />
            <span><span className="block font-medium">{l.full_name}</span><span className="text-xs text-fg-subtle">{l.relation === "sponsor" ? "Sponsor" : "Team leader"}</span></span>
          </label>
        ))}
      </div>
      <VoiceTextarea value={message} onValueChange={setMessage} rows={2} maxLength={1000} aria-label="Message (optional)" placeholder="Add a note (optional). Type or tap Speak." />
      <Button onClick={send} disabled={pending || picked.length === 0}><Send className="size-4" aria-hidden />{pending ? "Sending…" : "Send"}</Button>
    </div>
  );
}
