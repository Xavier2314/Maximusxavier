"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { markPresentAction } from "../actions";

/** For members who came but forgot to check in. */
export function MarkPresent({ userId, officeId, date }: { userId: string; officeId: string; date: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState("");
  return (
    <span className="flex items-center gap-2">
      {error && <span className="text-xs text-danger">{error}</span>}
      <Button size="sm" variant="outline" disabled={pending}
        onClick={() => start(async () => { const r = await markPresentAction({ userId, officeId, date }); setError(r.ok ? "" : r.message); })}>
        Mark present
      </Button>
    </span>
  );
}
