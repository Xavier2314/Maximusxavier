"use client";

import { useEffect, useRef, useState, type ComponentProps } from "react";
import { Mic, Square, Volume2, VolumeX } from "lucide-react";
import { Textarea } from "@/components/ui/form";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Speech to text (browser Speech Recognition: Chrome, Edge, Android, iPhone Safari)
// ---------------------------------------------------------------------------

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  start(): void; stop(): void; abort(): void;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error: string }) => void) | null;
};
function recognitionCtor(): (new () => Recognition) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Dictate into a text value. Keeps listening (through pauses) until the member taps Stop. */
export function useDictation(onText: (text: string) => void) {
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(false);
  const [error, setError] = useState("");
  const rec = useRef<Recognition | null>(null);
  const wanted = useRef(false);
  const lang = useRef("en-NG");
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => { setSupported(Boolean(recognitionCtor())); }, []);
  useEffect(() => () => { wanted.current = false; rec.current?.abort(); }, []);

  const begin = () => {
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    const r = new Ctor();
    r.lang = lang.current;
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let text = "";
      for (let i = e.resultIndex; i < e.results.length; i++) if (e.results[i].isFinal) text += e.results[i][0].transcript;
      if (text.trim()) cb.current(text.trim());
    };
    r.onerror = (e) => {
      if (e.error === "language-not-supported" && lang.current !== "en-US") { lang.current = "en-US"; return; } // retried in onend
      if (e.error === "no-speech" || e.error === "aborted") return;
      wanted.current = false;
      setError(e.error === "not-allowed" || e.error === "service-not-allowed"
        ? "Allow microphone access for this site, then tap Speak again."
        : e.error === "network" ? "Voice needs an internet connection. Please try again." : "Voice input stopped. Tap Speak to try again.");
    };
    // Browsers stop after a pause; restart quietly while the member still wants to talk.
    r.onend = () => { if (wanted.current) { try { begin(); } catch { setListening(false); } } else setListening(false); };
    rec.current = r;
    r.start();
  };
  const start = () => {
    setError("");
    wanted.current = true;
    try { begin(); setListening(true); } catch { setError("Voice input couldn't start. Please try again."); }
  };
  const stop = () => { wanted.current = false; rec.current?.stop(); setListening(false); };
  return { listening, supported, error, start, stop };
}

export function MicButton({ onText, className }: { onText: (text: string) => void; className?: string }) {
  const d = useDictation(onText);
  if (!d.supported) return null;
  return (
    <span className={cn("inline-flex flex-wrap items-center gap-2", className)}>
      <button type="button" onClick={d.listening ? d.stop : d.start} aria-pressed={d.listening}
        aria-label={d.listening ? "Stop voice input" : "Speak instead of typing"}
        className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl px-3 text-sm font-medium transition-colors",
          d.listening ? "bg-danger text-white" : "bg-primary-soft text-primary hover:brightness-95")}>
        {d.listening ? (
          <><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-white/80" /><span className="relative inline-flex size-2.5 rounded-full bg-white" /></span>Listening… tap to stop</>
        ) : <><Mic className="size-4" aria-hidden />Speak</>}
      </button>
      {d.error && <span className="text-xs text-danger" role="alert">{d.error}</span>}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Text to speech: a calm, natural female voice from the device
// ---------------------------------------------------------------------------

// Natural-sounding female voices, best first. Neural/"Natural"/"Premium" voices
// sound far less robotic than the default system voice.
const PREFERRED = [
  /Microsoft (Ava|Emma|Jenny|Aria|Sonia|Libby|Ezinne).*(Natural|Online)/i,
  /Google UK English Female/i,
  /(Samantha|Ava|Serena|Moira|Karen|Tessa|Zoe|Allison|Susan).*(Premium|Enhanced)/i,
  /\b(Samantha|Ava|Serena|Moira|Karen|Tessa|Fiona|Victoria|Zoe|Allison)\b/i,
  /Google US English/i,
  /female/i,
];
const MALE = /\b(male|Daniel|Alex|Fred|Thomas|Oliver|Arthur|Gordon|Aaron|Rishi|Guy|Ryan|Christopher|Eric|Roger|Brian|Davis)\b/i;

let cachedVoice: SpeechSynthesisVoice | null | undefined;
function pickVoice(): SpeechSynthesisVoice | null {
  if (cachedVoice !== undefined) return cachedVoice;
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("en"));
  if (voices.length === 0) return null; // not loaded yet; try again next time
  for (const re of PREFERRED) {
    const v = voices.find((x) => re.test(x.name) && !MALE.test(x.name.replace(/female/i, "")));
    if (v) return (cachedVoice = v);
  }
  return (cachedVoice = voices.find((v) => !MALE.test(v.name)) ?? voices[0]);
}

/** Splits long text into sentence-sized pieces (some browsers cut off long utterances). */
function chunks(text: string): string[] {
  const parts = text.replace(/\s+/g, " ").match(/[^.!?\n]+[.!?]*\s*/g) ?? [text];
  const out: string[] = [];
  let buf = "";
  for (const p of parts) {
    if ((buf + p).length > 220 && buf) { out.push(buf.trim()); buf = ""; }
    buf += p;
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

/** Reads text out loud in a calm, soft voice. */
export function ReadAloud({ text, label = "Read aloud", className }: { text: string; label?: string; className?: string }) {
  const [speaking, setSpeaking] = useState(false);
  const [supported, setSupported] = useState(false);
  const run = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    setSupported(true);
    const load = () => { cachedVoice = undefined; pickVoice(); };
    window.speechSynthesis.addEventListener("voiceschanged", load);
    load();
    return () => { window.speechSynthesis.removeEventListener("voiceschanged", load); window.speechSynthesis.cancel(); };
  }, []);
  if (!supported || !text.trim()) return null;

  const stop = () => { run.current++; window.speechSynthesis.cancel(); setSpeaking(false); };
  const play = () => {
    window.speechSynthesis.cancel();
    const id = ++run.current;
    const voice = pickVoice();
    const pieces = chunks(text);
    pieces.forEach((piece, i) => {
      const u = new SpeechSynthesisUtterance(piece);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else u.lang = "en-GB";
      u.rate = 0.92;   // unhurried
      u.pitch = 1.0;   // natural, not sing-song
      u.volume = 0.9;
      if (i === pieces.length - 1) u.onend = () => { if (run.current === id) setSpeaking(false); };
      u.onerror = () => { if (run.current === id) setSpeaking(false); };
      window.speechSynthesis.speak(u);
    });
    setSpeaking(true);
  };

  return (
    <button type="button" onClick={speaking ? stop : play}
      className={cn("inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium hover:bg-surface-muted", className)}>
      {speaking ? <VolumeX className="size-4" aria-hidden /> : <Volume2 className="size-4" aria-hidden />}{speaking ? "Stop" : label}
    </button>
  );
}

/** A textarea members can type in or speak into. Works inside normal forms (uses `name`). */
export function VoiceTextarea({ defaultValue, value: controlled, onValueChange, className, ...props }:
  Omit<ComponentProps<"textarea">, "value" | "defaultValue"> & { defaultValue?: string; value?: string; onValueChange?: (v: string) => void }) {
  const [inner, setInner] = useState(defaultValue ?? "");
  const value = controlled ?? inner;
  const latest = useRef(value);
  latest.current = value;
  const set = (v: string) => { if (controlled === undefined) setInner(v); onValueChange?.(v); };
  return (
    <div className="space-y-2">
      <Textarea {...props} className={className} value={value} onChange={(e) => set(e.target.value)} />
      <div className="flex flex-wrap items-center gap-2">
        <MicButton onText={(t) => { const cur = latest.current; set(cur ? `${cur.replace(/\s+$/, "")} ${t}` : t); }} />
        <ReadAloud text={value} label="Listen" />
      </div>
    </div>
  );
}
