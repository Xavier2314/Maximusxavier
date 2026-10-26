"use client";
/**
 * Spoken voice (text-to-speech) for the AI coach and reminders, using the
 * browser's built-in speech synthesis. Works while MY RHYTHM is open on screen.
 * iPhone requires one tap before the first sentence can be spoken.
 */
const KEY = "myrhythm.voice";

export function voiceSupported() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function voiceEnabled() {
  try { return localStorage.getItem(KEY) !== "0"; } catch { return true; }
}

export function setVoiceEnabled(on: boolean) {
  try { localStorage.setItem(KEY, on ? "1" : "0"); } catch {}
  if (on) unlockVoice();
  else if (voiceSupported()) window.speechSynthesis.cancel();
}

/** Call from a tap/click so iOS allows later speech. */
export function unlockVoice() {
  if (!voiceSupported()) return;
  try {
    const u = new SpeechSynthesisUtterance(" ");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {}
}

function pickVoice(): SpeechSynthesisVoice | undefined {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => /en[-_](NG|GB)/i.test(v.lang) && /natural|premium|enhanced|siri/i.test(v.name)) ??
    voices.find((v) => /en[-_](NG|GB|US)/i.test(v.lang) && /samantha|daniel|karen|moira|google/i.test(v.name)) ??
    voices.find((v) => v.lang?.toLowerCase().startsWith("en"))
  );
}

export function speak(text: string, opts: { interrupt?: boolean; force?: boolean } = {}) {
  if (!voiceSupported() || (!opts.force && !voiceEnabled()) || !text.trim()) return;
  try {
    if (opts.interrupt) window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) u.voice = v;
    u.rate = 1;
    u.pitch = 1;
    window.speechSynthesis.speak(u);
  } catch {}
}
