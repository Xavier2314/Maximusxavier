"use client";

import { useState, useTransition } from "react";
import { MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { openTeamChatAction } from "./actions";

export function ChatButton({ memberId, view, label = "Chat", className }: { memberId: string; view?: string; label?: string; className?: string }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <>
      <button type="button" disabled={pending} onClick={() => start(async () => { const r = await openTeamChatAction(memberId, view); if (r) setMsg(r.message); })}
        className={cn("inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-4 font-medium text-primary-fg transition-colors hover:bg-primary-hover disabled:opacity-60", className)}>
        <MessageCircle className="size-5" aria-hidden /> {pending ? "Opening…" : label}
      </button>
      {msg && <span className="text-sm" role="alert">{msg}</span>}
    </>
  );
}
