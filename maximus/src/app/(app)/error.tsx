"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/misc";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-lg">
      <EmptyState icon={<TriangleAlert className="size-6" />} title="We couldn't load this page"
        description={<>Please check your connection and try again.{error.digest && <span className="mt-2 block font-mono text-xs text-fg-subtle">Ref: {error.digest}</span>}</>}
        action={<Button onClick={reset}><RotateCcw className="size-4" aria-hidden /> Try again</Button>} />
    </div>
  );
}
