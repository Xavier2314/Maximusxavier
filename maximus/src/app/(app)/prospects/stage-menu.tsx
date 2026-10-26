"use client";

import { useTransition } from "react";
import { STAGES, type ProspectStage } from "@/lib/prospects";
import { setStageAction } from "./actions";

/** Compact "move to stage" control on each board card. */
export function StageMenu({ id, stage }: { id: string; stage: ProspectStage }) {
  const [pending, start] = useTransition();
  return (
    <select aria-label="Move to stage" value={stage} disabled={pending}
      onChange={(e) => { const s = e.target.value; start(async () => { await setStageAction(id, s); }); }}
      className="h-7 max-w-[92px] rounded-lg border border-border bg-surface px-1.5 text-xs text-fg-muted">
      {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
    </select>
  );
}
