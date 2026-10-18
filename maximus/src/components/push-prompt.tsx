"use client";

import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { subscribePush } from "@/app/(app)/settings/push-toggle";

const KEY = "mx-push-prompt-dismissed";

/** Asks members to turn on notifications on this device (phone, tablet or laptop) until they do. */
export function PushPrompt() {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!vapid || !("serviceWorker" in navigator) || !("PushManager" in window) || typeof Notification === "undefined") return;
        if (Notification.permission === "denied") return;
        const dismissed = Number(localStorage.getItem(KEY) ?? 0);
        if (Date.now() - dismissed < 3 * 86400000) return;
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub && Notification.permission === "granted") {
          // Already on: once per visit, make sure the server still has this device (it may have been cleaned up).
          if (sessionStorage.getItem("mx-push-synced")) return;
          sessionStorage.setItem("mx-push-synced", "1");
          void fetch("/api/push/subscribe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(sub.toJSON()) });
          return;
        }
        setShow(true);
      } catch { /* ignore */ }
    })();
  }, [vapid]);

  if (!show) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-primary/30 bg-primary-soft/60 px-4 py-3 text-sm">
      <BellRing className="size-5 shrink-0 text-primary" aria-hidden />
      <p className="min-w-0 flex-1">{msg ?? "Turn on notifications on this device to get alerts for messages, payments, approvals and reminders."}</p>
      <button type="button" disabled={busy} className="h-9 rounded-xl bg-primary px-4 font-semibold text-primary-fg disabled:opacity-60"
        onClick={async () => {
          setBusy(true);
          try {
            const r = await subscribePush(vapid);
            if (r === "on") setShow(false);
            else setMsg(r === "denied" ? "Notifications are blocked. Allow them in your browser's site settings." : "Notifications weren't allowed.");
          } catch { setMsg("Couldn't turn on notifications. Try again from Settings."); }
          setBusy(false);
        }}>
        Turn on
      </button>
      <button type="button" aria-label="Not now" className="rounded-lg p-1 text-fg-muted hover:text-fg"
        onClick={() => { try { localStorage.setItem(KEY, String(Date.now())); } catch { /* ignore */ } setShow(false); }}>
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
