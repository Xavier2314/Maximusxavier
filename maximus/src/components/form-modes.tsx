"use client";

import { useState, useTransition } from "react";
import { Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { VoiceTextarea } from "@/components/voice";
import { cn } from "@/lib/utils";

export type FormMode = "ai" | "write" | "form";

const MODES: { key: FormMode; short: string; hint: string }[] = [
  { key: "ai", short: "Ask AI", hint: "Speak or type freely, and Maximus AI arranges it into the form" },
  { key: "write", short: "Write it", hint: "Write it in your own words" },
  { key: "form", short: "Fill the form", hint: "Fill in each field, step by step" },
];

/** The three ways to fill anything in Maximus, as one segmented control. */
export function ModeTabs({ mode, onChange }: { mode: FormMode; onChange: (m: FormMode) => void }) {
  const current = MODES.find((m) => m.key === mode) ?? MODES[0];
  return (
    <div>
      <div className="grid grid-cols-3 gap-1 rounded-lg bg-surface-muted p-1" role="tablist" aria-label="How do you want to do this?">
        {MODES.map((m) => (
          <button key={m.key} type="button" role="tab" aria-selected={mode === m.key} onClick={() => onChange(m.key)}
            className={cn("min-h-10 rounded-md px-2 text-sm font-medium leading-tight transition-colors",
              mode === m.key ? "bg-surface text-fg shadow-sm" : "text-fg-muted hover:text-fg")}>
            {m.short}
          </button>
        ))}
      </div>
      <p className="mt-2 text-sm text-fg-subtle">{current.hint}</p>
    </div>
  );
}

/** "Talk to Maximus AI": say or type it any way; the AI fills the form. */
export function TalkToAi({ placeholder, arrange, onArranged }: {
  placeholder: string;
  arrange: (text: string) => Promise<{ ok: boolean; message: string; data?: Record<string, unknown> }>;
  onArranged: (data: Record<string, unknown>, text: string) => void;
}) {
  const [text, setText] = useState("");
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="space-y-3 rounded-xl border border-border bg-surface-muted/50 p-4">
      <p className="text-sm text-fg-muted">Tap <b>Speak</b> and just talk, or type it however you like. Maximus AI will arrange everything into the form for you to check.</p>
      <VoiceTextarea value={text} onValueChange={setText} rows={5} maxLength={4000} placeholder={placeholder} aria-label="Tell Maximus AI" />
      <FormMessage state={notice} />
      <Button disabled={pending || text.trim().length < 5}
        onClick={() => start(async () => { const r = await arrange(text); setNotice(r.ok ? null : r); if (r.ok && r.data) onArranged(r.data, text); })}>
        <Bot className="size-4" aria-hidden />{pending ? "Arranging…" : "Arrange it for me"}
      </Button>
    </div>
  );
}

export function AiFilledBanner() {
  return <p className="rounded-xl bg-success-soft px-3 py-2 text-sm text-success" role="status">Maximus AI filled this in for you. Check it, change anything, then submit.</p>;
}
