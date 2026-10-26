"use client";

import { useEffect } from "react";
import { reloadIfStaleBuild, reportClientError } from "@/lib/report-error";

/** Catches errors in the app frame (sidebar, header) so members never see a blank page. */
export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!reloadIfStaleBuild(error)) reportClientError(error);
  }, [error]);
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="card max-w-md p-8 text-center">
        <p className="text-4xl" aria-hidden>⚠️</p>
        <h1 className="mt-3 text-xl font-bold">Something went wrong</h1>
        <p className="mt-1 text-sm text-fg-muted">Please try again. We&apos;ve been sent the details so we can fix it.</p>
        {error.digest && <p className="mt-2 font-mono text-xs text-fg-subtle">Ref: {error.digest}</p>}
        <div className="mt-5 flex justify-center gap-2">
          <button type="button" onClick={reset} className="h-11 rounded-xl bg-primary px-5 font-medium text-primary-fg">Try again</button>
          <button type="button" onClick={() => location.assign("/dashboard")} className="h-11 rounded-xl border border-border px-5 font-medium">Go home</button>
        </div>
      </div>
    </main>
  );
}
