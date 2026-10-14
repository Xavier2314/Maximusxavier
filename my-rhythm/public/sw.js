/* MY RHYTHM service worker — push notifications, offline-friendly caching. */
const VERSION = "myrhythm-v2";
const STATIC_CACHE = `${VERSION}-static`;
const PAGE_CACHE = `${VERSION}-pages`;
const API_CACHE = `${VERSION}-api`;
const PRECACHE = ["/offline", "/icons/icon-192.png", "/icons/badge-72.png", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// ── Caching strategy ───────────────────────────────────────────────
// • /_next/static: cache-first (immutable, hashed)
// • pages: network-first, fall back to cached page, then /offline
// • GET /api/* (read-only data): network-first, fall back to last cached copy
//   so schedules can be viewed offline. Mutations are never cached.
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/cron") || url.pathname.startsWith("/api/export") || url.pathname.startsWith("/auth")) return;

  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons/")) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(STATIC_CACHE).then((c) => c.put(req, copy));
      return res;
    })));
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(API_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || new Response(JSON.stringify({ error: "You're offline and this data hasn't been saved on this device yet." }), { status: 503, headers: { "Content-Type": "application/json" } }))),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok && !res.redirected) {
            const copy = res.clone();
            caches.open(PAGE_CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("/offline"))),
    );
  }
});

// ── Push notifications ─────────────────────────────────────────────
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "MY RHYTHM", body: event.data ? event.data.text() : "You have a reminder." };
  }
  const title = data.title || "MY RHYTHM";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag || undefined,
    renotify: true,
    silent: false, // ask the OS to use its normal (audible) notification sound
    requireInteraction: data.kind === "activity" || data.kind === "snooze",
    vibrate: [200, 100, 200, 100, 300],
    timestamp: data.sentAt ? Date.parse(data.sentAt) : Date.now(),
    data: { url: data.url || "/", token: data.token, reminderId: data.reminderId, actionable: !!data.actionable },
    // Action buttons appear where supported (e.g. macOS Chrome). On iPhone, tap
    // the notification to open the app and act there.
    actions: data.actionable
      ? [{ action: "snooze", title: "Snooze 10 min" }, { action: "complete", title: "Mark done" }]
      : [],
  };

  event.waitUntil((async () => {
    // Safari requires every push to show a notification — always show it.
    await self.registration.showNotification(title, options);
    try {
      if (self.navigator && "setAppBadge" in self.navigator) await self.navigator.setAppBadge(data.badge || 1);
    } catch {}
    // Tell an open window to show the in-app alarm overlay (+ optional sound).
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if (w.visibilityState === "visible") w.postMessage({ type: "reminder", payload: { title, body: options.body, url: options.data.url, token: data.token, actionable: !!data.actionable } });
    }
    // Device receipt: proves this device got the push and asked the OS to show it.
    if (data.token) {
      const sub = await self.registration.pushManager.getSubscription();
      await fetch("/api/push/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: data.token, event: "received", endpoint: sub ? sub.endpoint : undefined }),
      }).catch(() => {});
    }
  })());
});

self.addEventListener("notificationclick", (event) => {
  const n = event.notification;
  const d = n.data || {};
  n.close();
  event.waitUntil((async () => {
    try {
      if (self.navigator && "clearAppBadge" in self.navigator) await self.navigator.clearAppBadge();
    } catch {}
    if (event.action === "snooze" || event.action === "complete") {
      if (d.token) {
        await fetch("/api/push/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token: d.token, action: event.action, minutes: 10 }),
        }).catch(() => {});
      }
      return;
    }
    if (d.token) {
      fetch("/api/push/receipt", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: d.token, event: "clicked" }) }).catch(() => {});
    }
    const url = new URL(d.url || "/", self.location.origin).href;
    const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of wins) {
      if ("focus" in w) {
        await w.focus();
        w.postMessage({ type: "navigate", url: d.url || "/" });
        return;
      }
    }
    await self.clients.openWindow(url);
  })());
});

// Subscription rotated by the browser/OS: re-register silently (uses the session cookie).
self.addEventListener("pushsubscriptionchange", (event) => {
  event.waitUntil((async () => {
    try {
      const old = event.oldSubscription;
      const key = old && old.options ? old.options.applicationServerKey : null;
      if (!key) return;
      const sub = await self.registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ subscription: sub.toJSON(), label: "Re-registered device" }),
      });
    } catch {}
  })());
});
