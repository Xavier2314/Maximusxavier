"use client";
import { useEffect, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const LINE = "Welcome to Accelerators Billionaires.";
const MUTE_KEY = "acc-voice-muted";
const PLAYED_KEY = "acc-welcome-played";

// Deeper, clearer voices first; falls back to any English voice the device has.
const PREFERRED = [/en-NG/i, /Google UK English Male/i, /Daniel/i, /Microsoft (Guy|Ryan|Christopher|Andrew|Brian)/i, /Arthur/i, /Aaron/i, /en-GB/i, /Google US English/i, /en-US/i, /^en/i];

function pickVoice() {
  const voices = window.speechSynthesis.getVoices();
  for (const re of PREFERRED) {
    const v = voices.find((x) => re.test(x.name) || re.test(x.lang));
    if (v) return v;
  }
  return null;
}

function speak() {
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(LINE);
  const v = pickVoice();
  if (v) { u.voice = v; u.lang = v.lang; } else u.lang = "en-GB";
  u.rate = 0.9;
  u.pitch = 0.85;
  u.volume = 1;
  synth.speak(u);
}

const get = (s: Storage, k: string) => { try { return s.getItem(k); } catch { return null; } };
const set = (s: Storage, k: string, v: string) => { try { s.setItem(k, v); } catch { /* storage blocked */ } };

/**
 * Says "Welcome to Accelerators Billionaires" once per visit. Browsers only allow sound after
 * the visitor interacts, so it plays on the first tap, click or key press. A small speaker
 * button lets visitors replay or mute it (remembered on their device).
 */
export function WelcomeVoice() {
  const [supported, setSupported] = useState(false);
  const [muted, setMuted] = useState(false);

  useEffect(() => {
    if (!("speechSynthesis" in window)) return;
    setSupported(true);
    const isMuted = get(localStorage, MUTE_KEY) === "1";
    setMuted(isMuted);
    window.speechSynthesis.getVoices(); // warm up the voice list (Chrome loads it lazily)
    if (isMuted || get(sessionStorage, PLAYED_KEY) === "1") return;

    const once = (e: Event) => {
      if ((e.target as Element | null)?.closest?.("[data-voice-toggle]")) return;
      cleanup();
      set(sessionStorage, PLAYED_KEY, "1");
      if (get(localStorage, MUTE_KEY) !== "1") speak();
    };
    const events = ["pointerdown", "keydown", "touchend"] as const;
    const cleanup = () => events.forEach((t) => window.removeEventListener(t, once));
    events.forEach((t) => window.addEventListener(t, once, { once: false }));
    return cleanup;
  }, []);

  if (!supported) return null;

  return (
    <button
      type="button"
      data-voice-toggle
      onClick={() => {
        if (muted) { setMuted(false); set(localStorage, MUTE_KEY, "0"); set(sessionStorage, PLAYED_KEY, "1"); speak(); }
        else { setMuted(true); set(localStorage, MUTE_KEY, "1"); window.speechSynthesis.cancel(); }
      }}
      className="fixed bottom-4 left-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-navy/90 text-white shadow-[0_0_20px_rgba(225,30,45,.35)] backdrop-blur transition-transform hover:scale-110"
      aria-label={muted ? "Turn welcome voice on" : "Mute welcome voice"}
      title={muted ? "Turn welcome voice on" : "Mute welcome voice"}
    >
      {muted ? <VolumeX size={18} aria-hidden="true" /> : <Volume2 size={18} aria-hidden="true" />}
    </button>
  );
}
