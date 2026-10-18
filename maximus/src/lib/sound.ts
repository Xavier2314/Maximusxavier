/** Small alert sounds made with the Web Audio API (no audio files to download). */
let ctx: AudioContext | null = null;

export function chime(times = 2) {
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const now = ctx.currentTime;
    for (let i = 0; i < times; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = i % 2 ? 660 : 880;
      g.gain.setValueAtTime(0.0001, now + i * 0.35);
      g.gain.exponentialRampToValueAtTime(0.25, now + i * 0.35 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.35 + 0.3);
      o.connect(g).connect(ctx.destination);
      o.start(now + i * 0.35);
      o.stop(now + i * 0.35 + 0.32);
    }
  } catch { /* audio not available */ }
}

export function buzz(pattern: number[] = [200, 100, 200]) {
  try { navigator.vibrate?.(pattern); } catch { /* not supported (e.g. iPhone) */ }
}

/** Show a system notification if the member allowed them (works while the app is open or in the background). */
export async function alertNotify(title: string, body: string) {
  try {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(title, { body, icon: "/icons/icon-192.png", tag: "maximus-timer" });
    else new Notification(title, { body });
  } catch { /* ignore */ }
}
