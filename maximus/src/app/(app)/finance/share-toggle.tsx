"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { shareFinancesAction } from "./actions";

export function ShareToggle({ viewerId, shared, name }: { viewerId: string; shared: boolean; name: string }) {
  const [on, setOn] = useState(shared);
  const [pending, start] = useTransition();
  return (
    <Button size="sm" variant={on ? "outline" : "secondary"} disabled={pending} aria-pressed={on}
      aria-label={on ? `Stop sharing finances with ${name}` : `Share finances with ${name}`}
      onClick={() => start(async () => { const r = await shareFinancesAction(viewerId, !on); if (r.ok) setOn(!on); })}>
      {on ? "Stop sharing" : "Share"}
    </Button>
  );
}
