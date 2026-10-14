"use client";
/**
 * In-app reminder sounds, synthesised with the Web Audio API (no audio files).
 * Only plays while MY RHYTHM is open in the foreground, after you have
 * enabled sound with a tap (browsers require a user gesture). A closed PWA
 * cannot play audio — background alerts use the system notification sound.
 */
let ctx: AudioContext | null = null;

export type SoundName = "chime" | "bell" | "pulse" | "gentle";
export const SOUNDS: { id: SoundName; label: string }[] = [
  { id: "chime", label: "Chime" },
  { id: "bell", label: "Bell" },
  { id: "pulse", label: "Pulse" },
  { id: "gentle", label: "Gentle" },
];

export function unlockAudio(): boolean {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx ??= new AC();
    if (ctx.state === "suspended") void ctx.resume();
    // play a silent blip to fully unlock on iOS
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    g.gain.value = 0;
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.01);
    return true;
  } catch {
    return false;
  }
}

export function audioReady() {
  return !!ctx && ctx.state === "running";
}

function tone(freq: number, start: number, dur: number, type: OscillatorType = "sine", vol = 0.25) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  const t = ctx.currentTime + start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ctx.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export function playSound(name: SoundName = "chime", repeat = 2) {
  if (!ctx) return false;
  if (ctx.state === "suspended") void ctx.resume();
  for (let r = 0; r < repeat; r++) {
    const off = r * 1.6;
    switch (name) {
      case "chime":
        [784, 988, 1175].forEach((f, i) => tone(f, off + i * 0.18, 0.9));
        break;
      case "bell":
        tone(660, off, 1.4, "triangle", 0.3);
        tone(1320, off, 0.8, "sine", 0.12);
        break;
      case "pulse":
        [0, 0.25, 0.5].forEach((d) => tone(880, off + d, 0.18, "square", 0.08));
        break;
      case "gentle":
        tone(523, off, 1.2, "sine", 0.18);
        tone(659, off + 0.3, 1.2, "sine", 0.14);
        break;
    }
  }
  try {
    navigator.vibrate?.([200, 100, 200]);
  } catch {}
  return true;
}
