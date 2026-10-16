"use client";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, CircleCheck, Copy, ExternalLink, Landmark, LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import { REFERRAL_OPTIONS } from "@/lib/validation";
import { BANK_ACCOUNT, POSITIONS } from "@/lib/fees";

export type WindowInfo = { name: string; open: boolean; statusLabel: string };

type Values = { position: string; fullName: string; email: string; phone: string; city: string; organisation: string; referralSource: string; notes: string; consent: boolean };
const EMPTY: Values = { position: "", fullName: "", email: "", phone: "", city: "", organisation: "", referralSource: "", notes: "", consent: false };

const naira = (kobo: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(kobo / 100);

function clientCheck(v: Values) {
  const e: Record<string, string> = {};
  if (!v.position) e.position = "Choose your membership position";
  if (v.fullName.trim().length < 3) e.fullName = "Enter your full name";
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Enter a valid email address";
  if (v.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a valid phone number";
  if (v.city.trim().length < 2) e.city = "Enter your city or state";
  if (!v.referralSource) e.referralSource = "Choose one option";
  if (!v.consent) e.consent = "Please accept the terms to continue";
  return e;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 2000); } catch { /* clipboard blocked: value stays selectable */ }
      }}
      className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-royal hover:text-navy"
      aria-label={`Copy ${label}`}
    >
      {done ? <><Check size={14} aria-hidden="true" /> Copied</> : <><Copy size={14} aria-hidden="true" /> Copy</>}
    </button>
  );
}

function BankDetails({ amountKobo, reference }: { amountKobo: number; reference: string | null }) {
  const rows: [string, string, boolean][] = [
    ["Amount", naira(amountKobo), false],
    ["Bank", BANK_ACCOUNT.bank, false],
    ["Account number", BANK_ACCOUNT.accountNumber, true],
    ["Account name", BANK_ACCOUNT.accountName, false],
  ];
  if (reference) rows.push(["Narration / reference", reference, true]);
  return (
    <div className="border-2 border-navy">
      <div className="flex items-center gap-3 bg-navy px-5 py-4 text-white">
        <Landmark size={20} aria-hidden="true" />
        <p className="text-xs font-semibold uppercase tracking-[0.2em]">Pay by bank transfer</p>
      </div>
      <dl className="divide-y divide-sand">
        {rows.map(([k, v, copy]) => (
          <div key={k} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
            <dt className="text-sm text-slate">{k}</dt>
            <dd className="flex items-center gap-4">
              <span className={`select-all font-semibold text-navy ${k === "Amount" || k === "Account number" ? "font-display text-2xl tabular-nums" : ""}`}>{v}</span>
              {copy && <CopyButton value={v} label={k} />}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function RegistrationForm({ window: win, saveReady, cardReady, officialFormUrl }: { window: WindowInfo | null; saveReady: boolean; cardReady: boolean; officialFormUrl: string }) {
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"details" | "review" | "pay" | "done">("details");
  const [busy, setBusy] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [sender, setSender] = useState({ name: "", bank: "" });
  const position = useMemo(() => POSITIONS.find((p) => p.id === v.position) ?? null, [v.position]);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((p) => ({ ...p, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  const err = (k: string) => (errors[k] ? <p id={`${k}-err`} className="field-error">{errors[k]}</p> : null);
  const aria = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `${k}-err` : undefined });
  const top = () => window.scrollTo({ top: 0, behavior: "smooth" });

  if (!win?.open) {
    return (
      <div className="border border-sand bg-cream p-8">
        <Lock className="text-slate" aria-hidden="true" />
        <p className="mt-4 font-display text-2xl text-navy">Registration is not open right now.</p>
        <p className="mt-2 text-slate">{win?.statusLabel ?? "Check back soon."}</p>
      </div>
    );
  }

  function toReview(e: React.FormEvent) {
    e.preventDefault();
    const e2 = clientCheck(v);
    setErrors(e2);
    if (Object.keys(e2).length) {
      document.getElementById(Object.keys(e2)[0] === "position" ? "position-group" : `r-${Object.keys(e2)[0]}`)?.focus();
      return;
    }
    setStep("review");
    top();
  }

  async function start(method: "bank_transfer" | "card") {
    setBusy(true);
    setServerMsg(null);
    try {
      const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, method }) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.authorizationUrl) { window.location.assign(json.authorizationUrl); return; }
      if (res.ok && json.reference) { setReference(json.reference); setStep("pay"); top(); setBusy(false); return; }
      if (json.errors) { setErrors(json.errors); setStep("details"); }
      setServerMsg(json.message ?? "We could not save your registration. Please try again.");
    } catch {
      setServerMsg("We could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  async function confirmTransfer(e: React.FormEvent) {
    e.preventDefault();
    if (sender.name.trim().length < 2) { setErrors({ senderName: "Enter the name on the account you paid from" }); return; }
    setBusy(true);
    setServerMsg(null);
    try {
      const res = await fetch("/api/register/transfer", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reference, senderName: sender.name, senderBank: sender.bank }) });
      const json = await res.json().catch(() => ({}));
      if (res.ok) { setStep("done"); top(); setBusy(false); return; }
      setServerMsg(json.message ?? "We could not record your transfer. Please try again.");
    } catch {
      setServerMsg("We could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  /* ---------- DONE ---------- */
  if (step === "done" && reference && position) {
    return (
      <div role="status">
        <CircleCheck className="text-royal" size={48} aria-hidden="true" />
        <p className="eyebrow mt-6">Transfer received for checking</p>
        <h2 className="display-md mt-3 text-navy">Thank you, {v.fullName.split(" ")[0]}.</h2>
        <p className="mt-4 text-ink/80">We have recorded your registration and your transfer details. Our team will check the payment against your reference and confirm your place by email or WhatsApp.</p>
        <dl className="mt-6 divide-y divide-sand border-y border-sand text-sm">
          {([["Reference", reference], ["Position", position.name], ["Amount", naira(position.feeKobo)], ["Paid from", sender.name]] as const).map(([k, val]) => (
            <div key={k} className="grid grid-cols-3 py-3"><dt className="text-slate">{k}</dt><dd className="col-span-2 font-semibold text-navy">{val}</dd></div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-slate">Keep your reference. You will need it at check-in.</p>
      </div>
    );
  }

  /* ---------- PAY (bank transfer, reference issued) ---------- */
  if (step === "pay" && reference && position) {
    return (
      <div>
        <p className="eyebrow">Step 3 of 3</p>
        <h2 className="display-md mt-3 text-navy">Make your transfer</h2>
        <p className="mt-4 text-ink/80">Transfer exactly <b>{naira(position.feeKobo)}</b> and use your reference <b>{reference}</b> as the narration, so we can match your payment.</p>
        <div className="mt-6"><BankDetails amountKobo={position.feeKobo} reference={reference} /></div>
        <form onSubmit={confirmTransfer} noValidate className="mt-8 space-y-5 border-t border-sand pt-8">
          <p className="font-semibold text-navy">After you have paid, tell us who the payment came from:</p>
          <div className="grid gap-5 sm:grid-cols-2">
            <div><label htmlFor="t-name" className="field-label">Name on the paying account *</label><input id="t-name" value={sender.name} onChange={(e) => setSender((s) => ({ ...s, name: e.target.value }))} className="field" aria-invalid={errors.senderName ? true : undefined} aria-describedby={errors.senderName ? "senderName-err" : undefined} />{err("senderName")}</div>
            <div><label htmlFor="t-bank" className="field-label">Your bank (optional)</label><input id="t-bank" value={sender.bank} onChange={(e) => setSender((s) => ({ ...s, bank: e.target.value }))} className="field" /></div>
          </div>
          {serverMsg && <p role="alert" className="border-l-4 border-red bg-red/5 px-4 py-3 text-sm">{serverMsg}</p>}
          <button type="submit" disabled={busy} className="btn btn-red w-full">{busy ? <><LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> Saving</> : "I have made the transfer"}</button>
          <p className="text-xs text-slate">Your place is confirmed only after the payment is verified by the Accelerator team.</p>
        </form>
      </div>
    );
  }

  /* ---------- REVIEW ---------- */
  if (step === "review" && position) {
    const rows: [string, string][] = [
      ["Position", position.name], ["Fee", naira(position.feeKobo)], ["Registration", win.name], ["Full name", v.fullName], ["Email", v.email],
      ["Phone", v.phone], ["City / state", v.city], ["Organisation", v.organisation || "-"], ["Heard about us", v.referralSource], ["Notes", v.notes || "-"],
    ];
    return (
      <div>
        <button type="button" onClick={() => setStep("details")} className="link-arrow !border-0 !p-0"><ArrowLeft size={16} aria-hidden="true" /> Edit details</button>
        <p className="eyebrow mt-6">Step 2 of 3</p>
        <h2 className="display-md mt-3 text-navy">Review your registration</h2>
        <dl className="mt-8 divide-y divide-sand border-y border-sand">
          {rows.map(([k, val]) => (
            <div key={k} className="grid grid-cols-3 gap-4 py-3 text-sm"><dt className="text-slate">{k}</dt><dd className="col-span-2 break-words text-navy">{val}</dd></div>
          ))}
        </dl>
        {serverMsg && <p role="alert" className="mt-6 border-l-4 border-red bg-red/5 px-4 py-3 text-sm">{serverMsg}</p>}

        {saveReady ? (
          <div className="mt-8 space-y-3">
            <button type="button" onClick={() => start("bank_transfer")} disabled={busy} className="btn btn-red w-full">
              {busy ? <><LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> Saving</> : <><Landmark size={16} aria-hidden="true" /> Get my payment reference</>}
            </button>
            {cardReady && (
              <button type="button" onClick={() => start("card")} disabled={busy} className="btn btn-ghost-dark w-full"><ShieldCheck size={16} aria-hidden="true" /> Pay online with card (Paystack)</button>
            )}
            <p className="text-xs text-slate">We will save your registration and give you a unique reference to use as your transfer narration.</p>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <BankDetails amountKobo={position.feeKobo} reference={null} />
            <p className="text-sm text-ink/80">Use your <b>full name</b> as the transfer narration. Then submit your registration and proof of payment on the official form so the team can confirm your place.</p>
            <a href={officialFormUrl} target="_blank" rel="noopener noreferrer" className="btn btn-red w-full">Submit proof on the official form <ExternalLink size={16} aria-hidden="true" /></a>
          </div>
        )}
      </div>
    );
  }

  /* ---------- DETAILS ---------- */
  return (
    <form onSubmit={toReview} noValidate className="space-y-8">
      <p className="eyebrow">Step 1 of 3</p>
      <fieldset id="position-group" tabIndex={-1} aria-describedby={errors.position ? "position-err" : undefined}>
        <legend className="field-label">Your membership position *</legend>
        <p className="mb-4 text-sm text-slate">Your registration fee depends on your position.</p>
        <div className="grid gap-2 sm:grid-cols-3">
          {POSITIONS.map((p) => {
            const on = v.position === p.id;
            return (
              <label key={p.id} className={`relative flex cursor-pointer flex-col border-2 px-4 py-3 transition-colors focus-within:ring-2 focus-within:ring-royal ${on ? "border-navy bg-navy text-white" : "border-sand bg-white hover:border-navy/40"}`}>
                <input type="radio" name="position" value={p.id} checked={on} onChange={set("position")} className="sr-only" />
                <span className="text-sm font-semibold">{p.name}</span>
                <span className={`mt-1 font-display text-xl tabular-nums ${on ? "text-white" : "text-red"}`}>{naira(p.feeKobo)}</span>
              </label>
            );
          })}
        </div>
        {err("position")}
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2"><label htmlFor="r-fullName" className="field-label">Full name *</label><input id="r-fullName" value={v.fullName} onChange={set("fullName")} autoComplete="name" className="field" {...aria("fullName")} />{err("fullName")}</div>
        <div><label htmlFor="r-email" className="field-label">Email *</label><input id="r-email" type="email" inputMode="email" value={v.email} onChange={set("email")} autoComplete="email" className="field" {...aria("email")} />{err("email")}</div>
        <div><label htmlFor="r-phone" className="field-label">Phone (WhatsApp preferred) *</label><input id="r-phone" type="tel" inputMode="tel" value={v.phone} onChange={set("phone")} autoComplete="tel" placeholder="0803 123 4567" className="field" {...aria("phone")} />{err("phone")}</div>
        <div><label htmlFor="r-city" className="field-label">City / state *</label><input id="r-city" value={v.city} onChange={set("city")} autoComplete="address-level2" className="field" {...aria("city")} />{err("city")}</div>
        <div><label htmlFor="r-organisation" className="field-label">Team / office (optional)</label><input id="r-organisation" value={v.organisation} onChange={set("organisation")} autoComplete="organization" className="field" /></div>
        <div className="sm:col-span-2">
          <label htmlFor="r-referralSource" className="field-label">How did you hear about the event? *</label>
          <select id="r-referralSource" value={v.referralSource} onChange={set("referralSource")} className="field" {...aria("referralSource")}>
            <option value="" disabled>Choose one</option>
            {REFERRAL_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>{err("referralSource")}
        </div>
        <div className="sm:col-span-2"><label htmlFor="r-notes" className="field-label">Accessibility needs or notes (optional)</label><textarea id="r-notes" rows={3} value={v.notes} onChange={set("notes")} className="field" /></div>
      </div>

      <div>
        <label className="flex items-start gap-3 text-sm">
          <input id="r-consent" type="checkbox" checked={v.consent} onChange={set("consent")} className="mt-1 h-5 w-5 accent-[#0B1E3F]" {...aria("consent")} />
          <span>I agree to the <a href="/terms" target="_blank" className="underline">terms</a>, <a href="/refunds" target="_blank" className="underline">refund policy</a> and <a href="/privacy" target="_blank" className="underline">privacy policy</a>, and I confirm my details are correct. *</span>
        </label>
        {err("consent")}
      </div>

      {position && <p className="border-l-4 border-gold bg-cream px-4 py-3 text-sm text-navy">Your fee as a <b>{position.name}</b>: <b className="font-display text-lg">{naira(position.feeKobo)}</b></p>}
      <button type="submit" className="btn btn-navy w-full">Continue to review</button>
    </form>
  );
}
