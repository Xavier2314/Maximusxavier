"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { changeSponsorAction, setHomeOfficeAction, setRoleAction, setStatusAction } from "../actions";

const AUTO = ["member", "downline", "sponsor", "upline"];

export function MemberControls({ userId, isSelf, status, sponsorLabel, roles, offices, memberOffices }: {
  userId: string; isSelf: boolean; status: string; sponsorLabel: string;
  roles: { key: string; name: string; rank: number; held: boolean }[];
  offices: { id: string; name: string }[]; memberOffices: string[];
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [sponsor, setSponsor] = useState("");
  const [office, setOffice] = useState(offices[0]?.id ?? "");
  const run = (fn: () => Promise<{ ok: boolean; message: string }>) => start(async () => { const r = await fn(); setMsg({ ok: r.ok, text: r.message }); });

  return (
    <div className="space-y-8">
      {msg && <p role="status" className={cn("rounded-xl px-4 py-3 text-sm", msg.ok ? "bg-success-soft text-success" : "bg-danger-soft text-danger")}>{msg.text}</p>}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Roles</h3>
        <ul className="grid gap-2 sm:grid-cols-2">
          {roles.map((r) => {
            const auto = AUTO.includes(r.key);
            return (
              <li key={r.key} className={cn("flex items-center justify-between rounded-xl border px-3 py-2.5", r.held ? "border-primary/40 bg-primary-soft/50" : "border-border")}>
                <span className="text-sm"><span className="font-medium">{r.name}</span>{auto && <span className="block text-xs text-fg-subtle">Automatic</span>}</span>
                {!auto && (
                  <Button size="sm" variant={r.held ? "outline" : "secondary"} disabled={pending || (isSelf && r.key === "super_admin")}
                    onClick={() => { if (confirm(`${r.held ? "Remove" : "Grant"} ${r.name}?`)) run(() => setRoleAction(userId, r.key, !r.held)); }}>
                    {r.held ? "Remove" : "Grant"}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-2 text-xs text-fg-subtle">You can only grant roles below your own level. Every change is written to the audit log.</p>
      </section>

      <section>
        <h3 className="mb-1 text-sm font-semibold">Sponsor</h3>
        <p className="mb-3 text-sm text-fg-muted">Current: {sponsorLabel}</p>
        <div className="flex gap-2">
          <Input value={sponsor} onChange={(e) => setSponsor(e.target.value)} placeholder="New sponsor Member ID (blank = none)" aria-label="New sponsor Member ID" />
          <Button variant="secondary" disabled={pending} onClick={() => { if (confirm("Move this member (and their whole downline) under the new sponsor?")) run(() => changeSponsorAction(userId, sponsor)); }}>Change</Button>
        </div>
      </section>

      <section>
        <h3 className="mb-3 text-sm font-semibold">Office</h3>
        <p className="mb-2 text-sm text-fg-muted">Assigned: {memberOffices.length ? offices.filter((o) => memberOffices.includes(o.id)).map((o) => o.name).join(", ") : "none"}</p>
        <div className="flex gap-2">
          <Select value={office} onChange={(e) => setOffice(e.target.value)} aria-label="Office">{offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}</Select>
          <Button variant="secondary" disabled={pending || !office} onClick={() => run(() => setHomeOfficeAction(userId, office))}>Assign</Button>
        </div>
      </section>

      {!isSelf && (
        <section>
          <h3 className="mb-3 text-sm font-semibold">Account status</h3>
          <div className="flex flex-wrap gap-2">
            {(["active", "suspended", "deactivated"] as const).map((s) => (
              <Button key={s} size="sm" variant={status === s ? "primary" : s === "active" ? "outline" : "danger"} disabled={pending || status === s}
                onClick={() => { if (confirm(`Set this account to ${s}?`)) run(() => setStatusAction(userId, s)); }}>
                {s === "active" ? "Activate" : s === "suspended" ? "Suspend" : "Deactivate"}
              </Button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
