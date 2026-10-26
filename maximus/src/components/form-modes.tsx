"use client";

import { useState, useTransition } from "react";
import { ListChecks, PenLine, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form";
import { VoiceTextarea } from "@/components/voice";
import { cn } from "@/lib/utils";

export type FormMode = "ai" | "write" | "form";

const MODES: { key: FormMode; label: string; hint: string; icon: typeof Bot }[] = [
  { key: "ai", label: "Talk to Maximus AI", hint: "Speak or type freely; AI arranges it", icon: Bot },
  { key: "write", label: "Write it myself", hint: "In your own words", icon: PenLine },
  { key: "form", label: "Fill the form", hint: "Step by step", icon: ListChecks },
];

/** The three ways to fill anything in Maximus. */
export function ModeTabs({ mode, onChange }: { mode: FormMode; onChange: (m: FormMode) => void }) {
  return (
    <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="How do you want to do this?">
      {MODES.map((m) => (
        <button key={m.key} type="button" role="tab" aria-selected={mode === m.key} onClick={() => onChange(m.key)}
          className={cn("flex flex-col items-center gap-1 rounded-2xl border p-3 text-center transition-colors",
            mode === m.key ? "border-primary bg-primary-soft text-primary" : "border-border bg-surface text-fg-muted hover:border-primary/40")}>
          <m.icon className="size-5" aria-hidden />
          <span className="text-sm font-semibold leading-tight">{m.label}</span>
          <span className="hidden text-xs leading-tight opacity-80 sm:block">{m.hint}</span>
        </button>
      ))}
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
    <div className="space-y-3 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
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
