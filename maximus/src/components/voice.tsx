"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Mic, Square, Volume2, VolumeX } from "lucide-react";
import { Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";

// Minimal typing for the browser Speech Recognition API (Chrome, Edge, Safari, Android).
type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
};
function newRecognition(): Recognition | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
  return Ctor ? new Ctor() : null;
}

/** Hook: dictate into a text value. Words are appended as the member speaks. */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => { setSupported(Boolean(newRecognition())); }, []);
  useEffect(() => () => rec.current?.stop(), []);

  const start = () => {
    const r = newRecognition();
    if (!r) return;
    r.lang = "en-NG";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text.trim()) cb.current(text.trim());
    };
    r.onerror = (e) => setError(e.error === "not-allowed" ? "Allow microphone access to use voice." : "Voice input stopped. Tap the mic to try again.");
    r.onend = () => setListening(false);
    setError("");
    rec.current = r;
    r.start();
    setListening(true);
  };
  const stop = () => { rec.current?.stop(); setListening(false); };
  return { listening, supported, error, start, stop };
}

export function MicButton({ onText, className }: { onText: (text: string) => void; className?: string }) {
  const d = useDictation(onText);
  if (!d.supported) return null;
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <button type="button" onClick={d.listening ? d.stop : d.start} aria-pressed={d.listening}
        aria-label={d.listening ? "Stop voice input" : "Speak instead of typing"}
        className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors",
          d.listening ? "animate-pulse bg-danger text-white" : "bg-primary-soft text-primary hover:brightness-95")}>
        {d.listening ? <Square className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
        {d.listening ? "Stop" : "Speak"}
      </button>
      {d.error && <span className="text-xs text-danger">{d.error}</span>}
    </span>
  );
}

/** Reads text out loud with the phone's built-in voice. */
export function ReadAloud({ text, label = "Read aloud", className }: { text: string; label?: string; className?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  useEffect(() => { setSupported(typeof window !== "undefined" && "speechSynthesis" in window); }, []);
  useEffect(() => () => { if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel(); }, []);
  if (!supported || !text.trim()) return null;
  const toggle = () => {
    if (speaking) { window.speechSynthesis.cancel(); setSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-NG";
    u.onend = () => setSpeaking(false);
    window.speechSynthesis.speak(u);
    setSpeaking(true);
  };
  return (
    <button type="button" onClick={toggle} className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium hover:bg-surface-muted", className)}>
      {speaking ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}{speaking ? "Stop" : label}
    </button>
  );
}

/** A textarea members can type in or speak into. Works inside normal forms (uses `name`). */
export function VoiceTextarea({ defaultValue, value: controlled, onValueChange, className, ...props }:
  Omit<ComponentProps<"textarea">, "value" | "defaultValue"> & { defaultValue?: string; value?: string; onValueChange?: (v: string) => void }) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const value = controlled ?? inner;
  const set = (v: string) => { if (controlled === undefined) setInner(v); onValueChange?.(v); };
  return (
    <div className="space-y-2">
      <Textarea {...props} className={className} value={value} onChange={(e) => set(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <MicButton onText={(t) => set(value ? `${value.replace(/\s+$/, "")} ${t}` : t)} />
        <ReadAloud text={value} label="Listen" />
      </div>
    </div>
  );
}
