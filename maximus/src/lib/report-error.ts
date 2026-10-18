/** Client helpers for error screens: report the error, and recover from stale files after a deploy. */
export function reportClientError(error: Error & { digest?: string }) {
  try {
    const body = JSON.stringify({ message: error.message, name: error.name, digest: error.digest, stack: error.stack, url: location.href });
    navigator.sendBeacon?.("/api/client-error", new Blob([body], { type: "application/json" }))
      || fetch("/api/client-error", { method: "POST", body, keepalive: true }).catch(() => {});
  } catch { /* never let reporting break the error screen */ }
}

/** After a new deploy an open tab can ask for files that no longer exist. Reload once to get the new version. */
export function reloadIfStaleBuild(error: Error): boolean {
  const stale = error.name === "ChunkLoadError"
    || /Loading (CSS )?chunk|Failed to fetch dynamically imported module|Failed to load chunk|Server Action .* was not found|Failed to find Server Action|unexpected response was received from the server/i.test(error.message ?? "");
  if (!stale) return false;
  try {
    if (sessionStorage.getItem("mx-reloaded") === "1") return false;
    sessionStorage.setItem("mx-reloaded", "1");
  } catch { /* storage blocked: still try once */ }
  location.reload();
  return true;
}

/** Wrap a form's server action so a failure (offline, or the app was just updated) shows a message instead of crashing the page. */
export function safeAction<S, A extends unknown[]>(fn: (...args: A) => Promise<S>, fallback: S): (...args: A) => Promise<S> {
  return async (...args: A) => {
    try {
      return await fn(...args);
    } catch (e) {
      const err = e as Error;
      if (/NEXT_REDIRECT/.test(err?.message ?? "") || (err as { digest?: string })?.digest?.startsWith?.("NEXT_REDIRECT")) throw e;
      reportClientError(err instanceof Error ? err : new Error(String(e)));
      if (/Server Action .* was not found|Failed to find Server Action/i.test(err?.message ?? "")) {
        try { if (sessionStorage.getItem("mx-reloaded") !== "1") { sessionStorage.setItem("mx-reloaded", "1"); setTimeout(() => location.reload(), 1500); } } catch { /* ignore */ }
      }
      return fallback;
    }
  };
}
