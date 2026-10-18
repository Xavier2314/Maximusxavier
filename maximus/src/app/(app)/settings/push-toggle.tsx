"use client";

import { useEffect, useState } from "react";
import { BellRing, BellOff, Send, Smartphone } from "lucide-react";
import { sendTestPushAction } from "./actions";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Subscribe this browser to push and save it. Returns the resulting permission state. */
export async function subscribePush(vapidKey: string): Promise<"on" | "denied" | "off"> {
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
  await navigator.serviceWorker.ready;
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return permission === "denied" ? "denied" : "off";
  const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey) });
  const res = await fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
  if (!res.ok) throw new Error("save failed");
  return "on";
}

type State = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on" | "unconfigured";

/** Subscribes this device to web push. iPhone requires the app to be added to the Home Screen first. */
export function PushToggle({ vapidKey }: { vapidKey: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!vapidKey) return setState("unconfigured");
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) return setState(ios && !standalone ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      setState(sub ? "on" : "off");
    })();
  }, [vapidKey]);

  async function enable() {
    setBusy(true); setError(null);
    try {
      setState(await subscribePush(vapidKey));
    } catch {
      setError("We couldn't turn on notifications on this device. Please try again.");
    } finally { setBusy(false); }
  }

  async function disable() {
    setBusy(true);
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (sub) {
      await fetch("/api/push/subscribe", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) });
      await sub.unsubscribe();
    }
    setState("off"); setBusy(false);
  }

  const messages: Partial<Record<State, string>> = {
    unconfigured: "Push notifications haven't been configured by an administrator yet.",
    unsupported: "This browser doesn't support push notifications.",
    "ios-install": "On iPhone, tap Share → Add to Home Screen, then open Maximus from your Home Screen to enable notifications.",
    denied: "Notifications are blocked for this site. Allow them in your browser or phone settings, then return here.",
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border p-4 sm:flex-row sm:items-center">
      <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Smartphone className="size-5" aria-hidden /></span>
      <div className="flex-1">
        <p className="text-sm font-medium">Push notifications on this device</p>
        <p className="text-xs text-fg-muted">{messages[state] ?? (state === "on" ? "On — you'll get alerts even when Maximus is closed." : "Off for this device.")}</p>
        {error && <p className="mt-1 text-xs text-fg-muted" role="status">{error}</p>}
      </div>
      {state === "on" && (
        <span className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" disabled={busy} onClick={async () => { setBusy(true); const r = await sendTestPushAction(); setError(r.message); setBusy(false); }}>
            <Send className="size-4" aria-hidden /> Send a test
          </Button>
          <Button variant="outline" size="sm" disabled={busy} onClick={disable}><BellOff className="size-4" aria-hidden /> Turn off</Button>
        </span>
      )}
      {state === "off" && <Button size="sm" disabled={busy} onClick={enable}><BellRing className="size-4" aria-hidden /> Turn on</Button>}
    </div>
  );
}
