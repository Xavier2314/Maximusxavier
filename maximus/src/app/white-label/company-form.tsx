"use client";

import { useActionState, useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { startCompanyAction } from "./actions";

export function CompanyForm({ signedIn, prices }: { signedIn: boolean; prices: { standard: number; premium: number } }) {
  const [state, action] = useActionState(startCompanyAction, null);
  const [primary, setPrimary] = useState("#1d4ed8");
  const [accent, setAccent] = useState("#84cc16");
  const [name, setName] = useState("");
  const [tier, setTier] = useState<"standard" | "premium">("premium");
  const amount = prices[tier];
  const e = state?.errors ?? {};
  return (
    <form action={action} className="space-y-4">
      <FormMessage state={state} />
      <input type="hidden" name="tier" value={tier} />
      <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Choose your offer">
        {(["standard", "premium"] as const).map((t) => (
          <button key={t} type="button" role="radio" aria-checked={tier === t} onClick={() => setTier(t)}
            className={`rounded-2xl border-2 p-3 text-left ${tier === t ? "border-primary bg-primary-soft" : "border-border"}`}>
            <span className="block text-xs font-bold uppercase text-fg-muted">{t}</span>
            <span className="block text-lg font-extrabold">₦{prices[t].toLocaleString()}</span>
            <span className="block text-xs text-fg-muted">{t === "premium" ? "No Maximus anywhere" : "Your brand inside"}</span>
          </button>
        ))}
      </div>
      <Field label="Company name" htmlFor="company_name" error={e.company_name}>
        <Input id="company_name" name="company_name" required maxLength={60} value={name} onChange={(ev) => setName(ev.target.value)} placeholder="e.g. Kingdom Achievers" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Main colour" htmlFor="primary_color">
          <input id="primary_color" name="primary_color" type="color" value={primary} onChange={(ev) => setPrimary(ev.target.value)} className="h-11 w-full cursor-pointer rounded-xl border border-border bg-surface p-1" />
        </Field>
        <Field label="Accent colour" htmlFor="accent_color">
          <input id="accent_color" name="accent_color" type="color" value={accent} onChange={(ev) => setAccent(ev.target.value)} className="h-11 w-full cursor-pointer rounded-xl border border-border bg-surface p-1" />
        </Field>
      </div>
      <div className="flex items-center gap-3 rounded-2xl p-3 text-white" style={{ background: primary }}>
        <span className="grid size-9 place-items-center rounded-xl font-bold" style={{ background: accent, color: primary }}>{(name || "C").slice(0, 1).toUpperCase()}</span>
        <span className="truncate font-bold">{name || "Your company"}</span>
      </div>
      {!signedIn && (
        <>
          <Field label="Your full name" htmlFor="full_name" error={e.full_name}><Input id="full_name" name="full_name" required autoComplete="name" /></Field>
          <Field label="Email" htmlFor="email" error={e.email}><Input id="email" name="email" type="email" required autoComplete="email" /></Field>
          <Field label="Phone (WhatsApp)" htmlFor="phone" error={e.phone}><Input id="phone" name="phone" type="tel" required autoComplete="tel" placeholder="+234…" /></Field>
          <Field label="Create a password" htmlFor="password" error={e.password} hint="At least 8 characters, with a letter and a number.">
            <PasswordInput id="password" name="password" required minLength={8} autoComplete="new-password" />
          </Field>
        </>
      )}
      <SubmitButton className="h-12 w-full text-base font-semibold" pendingLabel="Opening Flutterwave…">
        <CreditCard className="size-5" aria-hidden />Pay ₦{amount.toLocaleString()} and create my app
      </SubmitButton>
      <p className="flex items-start gap-1.5 text-xs text-fg-subtle"><ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />Secure payment by Flutterwave. Your app is created as soon as the payment is confirmed.</p>
    </form>
  );
}
