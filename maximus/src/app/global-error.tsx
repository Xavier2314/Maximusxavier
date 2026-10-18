"use client";

import { useEffect } from "react";
import { reloadIfStaleBuild, reportClientError } from "@/lib/report-error";

/** Last line of defence when even the root layout fails. Plain styles: the app's CSS may not be loaded. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!reloadIfStaleBuild(error)) reportClientError(error);
  }, [error]);
  return (
    <html lang="en">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", fontFamily: "system-ui, sans-serif", background: "#f4f6fb", color: "#0f172a" }}>
        <div style={{ maxWidth: 420, padding: 32, textAlign: "center", background: "#fff", borderRadius: 20, boxShadow: "0 8px 24px -12px rgb(15 23 42 / .2)" }}>
          <h1 style={{ fontSize: 20, margin: "0 0 8px" }}>Something went wrong</h1>
          <p style={{ color: "#55617a", margin: 0 }}>Please try again. We&apos;ve been sent the details so we can fix it.</p>
          <div style={{ marginTop: 20, display: "flex", gap: 8, justifyContent: "center" }}>
            <button type="button" onClick={reset} style={{ height: 44, padding: "0 20px", borderRadius: 12, border: 0, background: "#305ee6", color: "#fff", fontWeight: 600 }}>Try again</button>
            <button type="button" onClick={() => location.assign("/dashboard")} style={{ height: 44, padding: "0 20px", borderRadius: 12, border: "1px solid #e2e7f1", background: "#fff", fontWeight: 600 }}>Go home</button>
          </div>
        </div>
      </body>
    </html>
  );
}
