"use client";
import { useMemo, useState } from "react";
import { ArrowLeft, LoaderCircle, Lock, ShieldCheck } from "lucide-react";
import { MEMBER_OPTIONS, REFERRAL_OPTIONS } from "@/lib/validation";

export type TicketOption = { id: "early_bird" | "late"; name: string; price: string | null; purchasable: boolean; statusLabel: string };

type Values = { fullName: string; email: string; phone: string; city: string; isMember: string; organisation: string; referralSource: string; notes: string; consent: boolean };
const EMPTY: Values = { fullName: "", email: "", phone: "", city: "", isMember: "", organisation: "", referralSource: "", notes: "", consent: false };

function clientCheck(v: Values) {
  const e: Record<string, string> = {};
  if (v.fullName.trim().length < 3) e.fullName = "Enter your full name";
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = "Enter a valid email address";
  if (v.phone.replace(/\D/g, "").length < 10) e.phone = "Enter a valid phone number";
  if (v.city.trim().length < 2) e.city = "Enter your city or state";
  if (!v.isMember) e.isMember = "Choose one option";
  if (!v.referralSource) e.referralSource = "Choose one option";
  if (!v.consent) e.consent = "Please accept the terms to continue";
  return e;
}

export function RegistrationForm({ tickets, initialTicket, paymentsReady }: { tickets: TicketOption[]; initialTicket?: string; paymentsReady: boolean }) {
  const available = tickets.filter((t) => t.purchasable);
  const [ticketId, setTicketId] = useState<string>(() => (available.find((t) => t.id === initialTicket) ?? available[0])?.id ?? "");
  const [v, setV] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"details" | "review">("details");
  const [busy, setBusy] = useState(false);
  const [serverMsg, setServerMsg] = useState<string | null>(null);
  const ticket = useMemo(() => tickets.find((t) => t.id === ticketId), [tickets, ticketId]);

  const set = (k: keyof Values) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setV((p) => ({ ...p, [k]: e.target.type === "checkbox" ? (e.target as HTMLInputElement).checked : e.target.value }));
  const err = (k: string) => (errors[k] ? <p id={`${k}-err`} className="field-error">{errors[k]}</p> : null);
  const aria = (k: string) => ({ "aria-invalid": errors[k] ? true : undefined, "aria-describedby": errors[k] ? `${k}-err` : undefined });

  function toReview(e: React.FormEvent) {
    e.preventDefault();
    const e2 = clientCheck(v);
    if (!ticketId) e2.ticketId = "Choose a ticket";
    setErrors(e2);
    if (Object.keys(e2).length) {
      document.getElementById(Object.keys(e2)[0] === "ticketId" ? "ticket-group" : `r-${Object.keys(e2)[0]}`)?.focus();
      return;
    }
    setStep("review");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function pay() {
    setBusy(true);
    setServerMsg(null);
    try {
      const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...v, ticketId }) });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.authorizationUrl) {
        window.location.assign(json.authorizationUrl);
        return;
      }
      if (json.errors) { setErrors(json.errors); setStep("details"); }
      setServerMsg(json.message ?? "We could not start the payment. Please try again.");
    } catch {
      setServerMsg("We could not reach the server. Check your connection and try again.");
    }
    setBusy(false);
  }

  if (!available.length) {
    return (
      <div className="border border-sand bg-white p-8">
        <Lock className="text-slate" aria-hidden="true" />
        <p className="mt-4 font-display text-2xl text-navy">No ticket is on sale right now.</p>
        <p className="mt-2 text-slate">{tickets.map((t) => `${t.name}: ${t.statusLabel}`).join(" · ")}</p>
      </div>
    );
  }

  if (step === "review" && ticket) {
    const rows: [string, string][] = [
      ["Ticket", ticket.name], ["Amount", ticket.price ?? "To be announced"], ["Full name", v.fullName], ["Email", v.email], ["Phone", v.phone],
      ["City / state", v.city], ["Member", v.isMember], ["Organisation", v.organisation || "-"], ["Heard about us", v.referralSource], ["Notes", v.notes || "-"],
    ];
    return (
      <div>
        <button type="button" onClick={() => setStep("details")} className="link-arrow !border-0 !p-0"><ArrowLeft size={16} aria-hidden="true" /> Edit details</button>
        <h2 className="display-md mt-6 text-navy">Review your registration</h2>
        <dl className="mt-8 divide-y divide-sand border-y border-sand">
          {rows.map(([k, val]) => (
            <div key={k} className="grid grid-cols-3 gap-4 py-3 text-sm"><dt className="text-slate">{k}</dt><dd className="col-span-2 break-words text-navy">{val}</dd></div>
          ))}
        </dl>
        {serverMsg && <p role="alert" className="mt-6 border-l-4 border-red bg-red/5 px-4 py-3 text-sm">{serverMsg}</p>}
        <button type="button" onClick={pay} disabled={busy || !paymentsReady || !ticket.price} className="btn btn-red mt-8 w-full">
          {busy ? <><LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> Connecting to Paystack</> : <><ShieldCheck size={16} aria-hidden="true" /> Pay {ticket.price ?? ""} securely</>}
        </button>
        {(!paymentsReady || !ticket.price) && <p className="mt-3 text-sm text-slate">Online payment opens once the ticket price and payment account are confirmed.</p>}
        <p className="mt-4 text-xs text-slate">You will be taken to Paystack to pay. We never see or store your card details. Your place is confirmed only after the payment is verified.</p>
      </div>
    );
  }

  return (
    <form onSubmit={toReview} noValidate className="space-y-8">
      <fieldset id="ticket-group" tabIndex={-1} aria-describedby={errors.ticketId ? "ticketId-err" : undefined}>
        <legend className="field-label">Ticket *</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {tickets.map((t) => (
            <label key={t.id} className={`relative flex cursor-pointer flex-col border-2 p-5 transition-colors ${ticketId === t.id ? "border-navy bg-navy text-white" : "border-sand bg-white"} ${!t.purchasable ? "cursor-not-allowed opacity-50" : ""}`}>
              <input type="radio" name="ticketId" value={t.id} checked={ticketId === t.id} disabled={!t.purchasable} onChange={() => setTicketId(t.id)} className="sr-only" />
              <span className="font-display text-2xl">{t.name}</span>
              <span className="mt-1 text-sm opacity-80">{t.price ?? "Price to be announced"}</span>
              <span className="mt-3 text-[11px] font-semibold uppercase tracking-[0.2em] opacity-80">{!t.purchasable && <Lock size={12} className="mr-1 inline" aria-hidden="true" />}{t.statusLabel}</span>
            </label>
          ))}
        </div>
        {err("ticketId")}
      </fieldset>

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="sm:col-span-2"><label htmlFor="r-fullName" className="field-label">Full name *</label><input id="r-fullName" value={v.fullName} onChange={set("fullName")} autoComplete="name" className="field" {...aria("fullName")} />{err("fullName")}</div>
        <div><label htmlFor="r-email" className="field-label">Email *</label><input id="r-email" type="email" inputMode="email" value={v.email} onChange={set("email")} autoComplete="email" className="field" {...aria("email")} />{err("email")}</div>
        <div><label htmlFor="r-phone" className="field-label">Phone (WhatsApp preferred) *</label><input id="r-phone" type="tel" inputMode="tel" value={v.phone} onChange={set("phone")} autoComplete="tel" placeholder="0803 123 4567" className="field" {...aria("phone")} />{err("phone")}</div>
        <div><label htmlFor="r-city" className="field-label">City / state *</label><input id="r-city" value={v.city} onChange={set("city")} autoComplete="address-level2" className="field" {...aria("city")} />{err("city")}</div>
        <div>
          <label htmlFor="r-isMember" className="field-label">Are you a member? *</label>
          <select id="r-isMember" value={v.isMember} onChange={set("isMember")} className="field" {...aria("isMember")}>
            <option value="" disabled>Choose one</option>
            {MEMBER_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </select>{err("isMember")}
        </div>
        <div><label htmlFor="r-organisation" className="field-label">Organisation / school (optional)</label><input id="r-organisation" value={v.organisation} onChange={set("organisation")} autoComplete="organization" className="field" /></div>
        <div>
          <label htmlFor="r-referralSource" className="field-label">How did you hear about us? *</label>
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

      {serverMsg && <p role="alert" className="border-l-4 border-red bg-red/5 px-4 py-3 text-sm">{serverMsg}</p>}
      <button type="submit" className="btn btn-navy w-full">Continue to review</button>
    </form>
  );
}
