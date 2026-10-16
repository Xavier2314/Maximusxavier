"use client";
import { useState } from "react";
import { Check, Copy, Landmark } from "lucide-react";
import { BANK_ACCOUNT } from "@/lib/fees";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* clipboard blocked: the value stays selectable */ }
      }}
      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-royal hover:text-navy"
      aria-label={`Copy ${label}`}
    >
      {done ? <><Check size={14} aria-hidden="true" /> Copied</> : <><Copy size={14} aria-hidden="true" /> Copy</>}
    </button>
  );
}

/** Official payment account (from the event flyer) with copy buttons. */
export function BankDetails() {
  const rows: [string, string, boolean][] = [
    ["Bank", BANK_ACCOUNT.bank, false],
    ["Account number", BANK_ACCOUNT.accountNumber, true],
    ["Account name", BANK_ACCOUNT.accountName, true],
  ];
  return (
    <div className="border-2 border-navy bg-white">
      <div className="flex items-center gap-3 bg-navy px-5 py-4 text-white">
        <Landmark size={20} aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">Official payment account</p>
      </div>
      <dl className="divide-y divide-sand">
        {rows.map(([k, v, copy]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <dt className="text-sm text-slate">{k}</dt>
            <dd className="flex items-center gap-4">
              <span className={`select-all font-semibold text-navy ${k === "Account number" ? "font-display text-3xl tabular-nums tracking-wide" : ""}`}>{v}</span>
              {copy && <CopyButton value={v} label={k} />}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
