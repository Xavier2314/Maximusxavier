"use client";
import { api } from "./api";

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

export function permission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export async function registerSW() {
  if (!("serviceWorker" in navigator)) return null;
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

export function deviceLabel() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "iPad";
  if (/Macintosh/.test(ua)) return /Safari/.test(ua) && !/Chrome/.test(ua) ? "Mac · Safari" : "Mac · Chrome";
  if (/Android/.test(ua)) return "Android";
  return "This device";
}

/** Ask permission (must be called from a tap) and register this device with the server. */
export async function enablePush(vapidPublicKey: string) {
  if (!pushSupported()) throw new Error(isIOS() && !isStandalone() ? "On iPhone, first add MY RHYTHM to your Home Screen and open it from there." : "This browser does not support push notifications.");
  if (!vapidPublicKey) throw new Error("Push isn't configured on the server yet (missing VAPID public key).");
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error(perm === "denied" ? "Notifications are blocked. Enable them in Settings → Notifications → MY RHYTHM." : "Permission was not granted.");
  const reg = (await navigator.serviceWorker.getRegistration()) ?? (await registerSW());
  await navigator.serviceWorker.ready;
  let sub = await reg!.pushManager.getSubscription();
  if (!sub) sub = await reg!.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) });
  await api("/api/push/subscribe", { body: { subscription: sub.toJSON(), label: deviceLabel(), platform: isIOS() ? "ios" : "web" } });
  return sub;
}

/** Re-register: drop the old subscription and create a fresh one. */
export async function reRegister(vapidPublicKey: string) {
  const old = await currentSubscription();
  if (old) {
    await api("/api/push/subscribe", { method: "DELETE", body: { endpoint: old.endpoint } }).catch(() => {});
    await old.unsubscribe().catch(() => {});
  }
  return enablePush(vapidPublicKey);
}
