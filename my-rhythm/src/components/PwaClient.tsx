"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlarmClock, Check, X } from "lucide-react";
import { registerSW } from "@/lib/client/push";
import { playSound, type SoundName } from "@/lib/client/sounds";
import { Button } from "./ui";

interface Alarm {
  title: string;
  body: string;
  url: string;
  token?: string;
  actionable?: boolean;
}

/**
 * Registers the service worker and shows the in-app reminder overlay when a
 * push arrives while MY RHYTHM is open in the foreground (optional sound,
 * only if you enabled it — browsers don't allow autoplay otherwise).
 */
export function PwaClient() {
  const [alarm, setAlarm] = useState<Alarm | null>(null);
  const router = useRouter();

  useEffect(() => {
    registerSW().catch(() => {});
    if (!("serviceWorker" in navigator)) return;
    const onMsg = (e: MessageEvent) => {
      if (e.data?.type === "reminder") {
        setAlarm(e.data.payload);
        try {
          if (localStorage.getItem("myrhythm.sound") === "1") playSound((localStorage.getItem("myrhythm.soundName") as SoundName) || "chime");
        } catch {}
      }
      if (e.data?.type === "navigate" && typeof e.data.url === "string") router.push(e.data.url);
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    // clear the app badge when opened
    (navigator as unknown as { clearAppBadge?: () => Promise<void> }).clearAppBadge?.().catch(() => {});
    return () => navigator.serviceWorker.removeEventListener("message", onMsg);
  }, [router]);

  if (!alarm) return null;
  const act = async (action: "snooze" | "complete") => {
    if (alarm.token) await fetch("/api/push/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: alarm.token, action, minutes: 10 }) }).catch(() => {});
    setAlarm(null);
  };
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#08101f]/50 p-6 backdrop-blur-sm" role="alertdialog" aria-label="Reminder">
      <div className="animate-fade-up w-full max-w-sm rounded-3xl border border-line bg-surface p-6 text-center shadow-2xl">
        <div className="animate-pulse-ring mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-lavender-soft text-lavender">
          <AlarmClock className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-semibold">{alarm.title}</h2>
        <p className="mt-1 text-ink-2">{alarm.body}</p>
        <div className="mt-5 grid grid-cols-2 gap-2">
          {alarm.actionable && <Button variant="secondary" onClick={() => act("snooze")}>Snooze 10 min</Button>}
          {alarm.actionable && <Button variant="sage" onClick={() => act("complete")}><Check className="h-4 w-4" /> Done</Button>}
          <Button className="col-span-2" onClick={() => { setAlarm(null); router.push(alarm.url || "/"); }}>Open</Button>
        </div>
        <button className="mt-3 inline-flex items-center gap-1 text-sm text-muted" onClick={() => setAlarm(null)}><X className="h-4 w-4" /> Dismiss</button>
      </div>
    </div>
  );
}
