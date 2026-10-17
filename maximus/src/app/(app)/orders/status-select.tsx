"use client";

import { useTransition } from "react";
import { updateOrderStatusAction } from "./actions";

type Status = "pending" | "confirmed" | "delivered" | "cancelled";

export function StatusSelect({ id, status, editable }: { id: string; status: Status; editable: boolean }) {
  const [pending, start] = useTransition();
  if (!editable) return <span className="capitalize text-fg-muted">{status}</span>;
  return (
    <select defaultValue={status} disabled={pending} aria-label="Order status"
      onChange={(e) => start(async () => { await updateOrderStatusAction(id, e.target.value as Status); })}
      className="rounded-lg border border-border bg-surface px-2 py-1 text-xs capitalize">
      {["pending", "confirmed", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
