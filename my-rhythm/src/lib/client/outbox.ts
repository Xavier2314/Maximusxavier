"use client";
import { api } from "./api";

/**
 * Tiny offline outbox for quick check-offs (complete / skip / start).
 * Actions taken offline are stored locally and replayed in order when the
 * connection returns. Schedule edits require a connection (to re-validate).
 */
const KEY = "myrhythm.outbox.v1";
type Item = { path: string; body: unknown; at: number };

function read(): Item[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? "[]"); } catch { return []; }
}
function write(items: Item[]) {
  try { localStorage.setItem(KEY, JSON.stringify(items)); } catch {}
}

export async function sendOrQueue(path: string, body: unknown) {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    write([...read(), { path, body, at: Date.now() }]);
    return { queued: true };
  }
  return api(path, { body });
}

export function pendingCount() {
  return typeof window === "undefined" ? 0 : read().length;
}

export async function flushOutbox() {
  const items = read();
  if (!items.length) return 0;
  const left: Item[] = [];
  for (const it of items) {
    try { await api(it.path, { body: it.body }); } catch { left.push(it); }
  }
  write(left);
  return items.length - left.length;
}
