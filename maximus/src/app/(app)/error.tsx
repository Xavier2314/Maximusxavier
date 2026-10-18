"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";
import { reloadIfStaleBuild, reportClientError } from "@/lib/report-error";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    if (!reloadIfStaleBuild(error)) reportClientError(error);
  }, [error]);
  return (
    <div className="card mx-auto mt-10 max-w-lg">
      <EmptyState icon={<TriangleAlert className="size-6" />} title="We couldn't load this page"
        description={<>Please try again. If it keeps happening, tell an admin. We&apos;ve been sent the details.{error.digest && <span className="mt-2 block font-mono text-xs text-fg-subtle">Ref: {error.digest}</span>}</>}
        action={<Button onClick={() => { try { sessionStorage.removeItem("mx-reloaded"); } catch { /* ignore */ } reset(); location.reload(); }}><RotateCcw className="size-4" aria-hidden /> Try again</Button>} />
    </div>
  );
}
