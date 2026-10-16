"use client";
import { useState } from "react";
import { ArrowUpRight, Check, CircleCheck, Copy, Landmark, Lock } from "lucide-react";
import { BANK_ACCOUNT, POSITIONS, type PositionId } from "@/lib/fees";
import { formatNaira } from "@/lib/tickets";

function CopyButton({ value, label, tone = "light" }: { value: string; label: string; tone?: "light" | "dark" }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* clipboard blocked: the value stays selectable */ }
      }}
      className={`inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] ${tone === "dark" ? "text-[#9DB2FF] hover:text-white" : "text-royal hover:text-navy"}`}
      aria-label={`Copy ${label}`}
    >
      {done ? <><Check size={14} aria-hidden="true" /> Copied</> : <><Copy size={14} aria-hidden="true" /> Copy</>}
    </button>
  );
}

/**
 * Registration page flow: fee by position and the official account are shown first.
 * The link to the official registration form is unlocked only after the visitor has chosen
 * a position and confirmed the transfer, so nobody reaches the form without knowing what to pay.
 */
export function RegisterFlow({ formUrl }: { formUrl: string }) {
  const [positionId, setPositionId] = useState<PositionId | null>(null);
  const [paid, setPaid] = useState(false);
  const position = POSITIONS.find((p) => p.id === positionId) ?? null;
  const amount = position ? formatNaira(position.feeKobo) ?? "" : null;
  const ready = Boolean(position && paid);

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
      {/* Step 1: fees */}
      <div className="lg:col-span-7">
        <div className="flex items-baseline gap-4">
          <span className="font-display text-4xl italic text-red">01</span>
          <div>
            <h2 className="display-md text-navy">Choose your position</h2>
            <p className="mt-1 text-sm text-ink/70">Your registration fee depends on your membership position.</p>
          </div>
        </div>

        <fieldset className="mt-8 bg-white p-4 shadow-[0_1px_0_rgba(11,30,63,.06)] md:p-6">
          <legend className="sr-only">Membership position</legend>
          <div className="grid grid-cols-[1fr_auto] border-b-2 border-navy px-3 pb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate">
            <span>Membership position</span><span>Fee</span>
          </div>
          <ol>
            {POSITIONS.map((p, i) => {
              const on = p.id === positionId;
              return (
                <li key={p.id}>
                  <label className={`grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 border-b px-3 py-3.5 transition-colors ${on ? "border-navy bg-navy text-white" : "border-sand text-navy hover:bg-cream"}`}>
                    <span className="flex items-center gap-4">
                      <input type="radio" name="position" value={p.id} checked={on} onChange={() => setPositionId(p.id)} className="sr-only" />
                      <span aria-hidden="true" className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-white" : "border-navy/40"}`}>
                        {on && <span className="h-2 w-2 rounded-full bg-white" />}
                      </span>
                      <span className={`w-6 font-display text-sm italic ${on ? "text-[#9DB2FF]" : "text-red"}`}>{String(i + 1).padStart(2, "0")}</span>
                      <span className="font-display text-lg md:text-xl">{p.name}</span>
                    </span>
                    <span className="font-display text-lg tabular-nums md:text-xl">{formatNaira(p.feeKobo)}</span>
                  </label>
                </li>
              );
            })}
          </ol>
        </fieldset>
      </div>

      {/* Steps 2 and 3: pay, then submit */}
      <div className="lg:col-span-5">
        <div className="space-y-6 lg:sticky lg:top-28">
          <div className="flex items-baseline gap-4">
            <span className="font-display text-4xl italic text-red">02</span>
            <div>
              <h2 className="display-md text-navy">Pay by bank transfer</h2>
              <p className="mt-1 text-sm text-ink/70">Use your <b>full name</b> as the narration and keep your receipt.</p>
            </div>
          </div>

          <div className="border-2 border-navy bg-white">
            <div className="flex items-center gap-3 bg-navy px-5 py-4 text-white">
              <Landmark size={20} aria-hidden="true" />
              <p className="text-xs font-semibold uppercase tracking-[0.2em]">Official payment account</p>
            </div>

            <div className={`flex flex-wrap items-center justify-between gap-3 px-5 py-5 ${position ? "bg-red text-white" : "bg-cream text-navy"}`} aria-live="polite">
              <div>
                <p className={`text-[11px] font-semibold uppercase tracking-[0.2em] ${position ? "text-white/80" : "text-slate"}`}>Amount to pay</p>
                <p className="mt-1 text-sm">{position ? position.name : "Choose your position to see your amount"}</p>
              </div>
              <p className="font-display text-4xl tabular-nums">{amount ?? "₦ —"}</p>
            </div>

            <dl className="divide-y divide-sand">
              {([["Bank", BANK_ACCOUNT.bank, false], ["Account number", BANK_ACCOUNT.accountNumber, true], ["Account name", BANK_ACCOUNT.accountName, true]] as const).map(([k, v, copy]) => (
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
          <p className="text-xs text-slate">Pay only into this official account. Never send money to an account shared any other way.</p>

          <div className="bg-navy p-6 text-white md:p-8">
            <div className="flex items-baseline gap-4">
              <span className="font-display text-4xl italic text-red">03</span>
              <h2 className="font-display text-3xl">Submit the form</h2>
            </div>
            <p className="mt-3 text-sm text-mist">Fill in the official registration form and attach your proof of payment. Your place is confirmed once the team verifies your payment.</p>

            <label className={`mt-6 flex items-start gap-3 text-sm ${position ? "cursor-pointer" : "cursor-not-allowed opacity-60"}`}>
              <input type="checkbox" checked={paid} disabled={!position} onChange={(e) => setPaid(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[#E31E2D]" />
              <span>{position ? <>I have transferred <b>{amount}</b> to {BANK_ACCOUNT.bank} {BANK_ACCOUNT.accountNumber} and I have my receipt.</> : "Choose your position first."}</span>
            </label>

            {ready ? (
              <a href={formUrl} target="_blank" rel="noopener noreferrer" className="btn btn-red mt-6 w-full whitespace-normal text-center">
                Click here to submit your registration <ArrowUpRight size={16} aria-hidden="true" />
              </a>
            ) : (
              <button type="button" disabled className="btn mt-6 w-full cursor-not-allowed whitespace-normal border border-white/20 bg-white/5 text-center text-white/60">
                <Lock size={16} aria-hidden="true" /> Click here to submit your registration
              </button>
            )}
            <p className="mt-3 flex items-center gap-2 text-xs text-mist">
              {ready ? <><CircleCheck size={14} className="text-[#9DB2FF]" aria-hidden="true" /> Opens the official form in a new tab.</> : "The form link unlocks after steps 1 and 2."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
