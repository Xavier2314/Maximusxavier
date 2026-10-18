"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/form";
import { setPositionAction } from "@/app/(app)/admin/members/actions";
import { POSITIONS } from "@/lib/positions";
import { cn } from "@/lib/utils";

/** Switch someone's role in one step, e.g. Admin → Super Admin. The server checks the caller may do it. */
export function PositionSwitcher({ userId, name, current, earningsManager, disabled, compact = false }: {
  userId: string; name: string; current: string; earningsManager: boolean; disabled?: boolean; compact?: boolean;
}) {
  const [position, setPosition] = useState(current);
  const [earnings, setEarnings] = useState(earningsManager);
  const [saved, setSaved] = useState({ position: current, earnings: earningsManager });
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const changed = position !== saved.position || earnings !== saved.earnings;

  const save = () => {
    const label = POSITIONS.find((p) => p.key === position)?.label ?? position;
    if (position !== saved.position && !confirm(`Make ${name} ${label === "Member" ? "a regular Member" : `a ${label}`}?`)) return;
    start(async () => {
      const r = await setPositionAction(userId, position, earnings);
      setMsg({ ok: r.ok, text: r.message });
      if (r.ok) setSaved({ position, earnings });
      else { setPosition(saved.position); setEarnings(saved.earnings); }
    });
  };

  return (
    <div className={cn(compact ? "flex flex-wrap items-center gap-2" : "space-y-3")}>
      <div className="flex gap-2">
        <Select value={position} onChange={(e) => setPosition(e.target.value)} disabled={disabled || pending}
          aria-label={`Role for ${name}`} className={compact ? "h-9 w-40 text-sm" : undefined}>
          {POSITIONS.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
        </Select>
        <Button size={compact ? "sm" : "md"} onClick={save} disabled={disabled || pending || !changed}>{pending ? "Saving…" : "Save"}</Button>
      </div>
      <label className={cn("flex items-center gap-2 text-fg-muted", compact ? "text-xs" : "text-sm")}>
        <Checkbox checked={earnings} onChange={(e) => setEarnings(e.target.checked)} disabled={disabled || pending} className="size-4" />
        Earnings Manager (approves payments)
      </label>
      {msg && <p role="status" className={cn("text-xs", msg.ok ? "text-success" : "text-danger")}>{msg.text}</p>}
    </div>
  );
}
