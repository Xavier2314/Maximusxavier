"use client";
import { useCallback, useEffect, useRef, useState } from "react";

type Rec = {
  start: () => void; stop: () => void; abort: () => void; lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null;
};

/** Speech-to-text via the browser (Safari/Chrome). Falls back to keyboard dictation where unavailable. */
export function useDictation(onText: (text: string) => void) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const rec = useRef<Rec | null>(null);
  const cb = useRef(onText);
  cb.current = onText;

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => rec.current?.abort();
  }, []);

  const start = useCallback((base = "") => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const C = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!C) return;
    setError(null);
    const r = new C();
    r.lang = "en-NG";
    r.interimResults = true;
    r.continuous = true;
    let finalText = "";
    const prefix = base ? `${base.trim()} ` : "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      cb.current((prefix + finalText + interim).trim());
    };
    r.onerror = (e) => {
      setError(e.error === "not-allowed" ? "Microphone access was denied — allow it in Settings, or use the keyboard's dictation key." : `Listening stopped (${e.error}).`);
      setListening(false);
    };
    r.onend = () => setListening(false);
    rec.current = r;
    r.start();
    setListening(true);
  }, []);

  const stop = useCallback(() => rec.current?.stop(), []);
  return { supported, listening, error, start, stop };
}
