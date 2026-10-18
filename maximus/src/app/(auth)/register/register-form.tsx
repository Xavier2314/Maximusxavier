"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, CircleCheck, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, Select } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { registerAction } from "../actions";

const STEPS = ["About you", "Your team", "Your account"] as const;
const STEP_FIELDS: string[][] = [
  ["full_name", "phone", "whatsapp", "date_of_birth", "gender"],
  ["office_id", "referral_code", "upline_member_id"],
  ["email", "password", "confirm_password", "privacy"],
];

export function RegisterForm({ offices, referralCode, uplineCode }: { offices: { id: string; name: string }[]; referralCode?: string; uplineCode?: string }) {
  const [state, action] = useActionState(registerAction, null);
  const [step, setStep] = useState(0);
  const [sponsor, setSponsor] = useState<{ name?: string; checking?: boolean; invalid?: boolean }>({});
  const [preview, setPreview] = useState<string | null>(null);
  const [tz, setTz] = useState("Africa/Lagos");
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state?.errors ?? {};

  useEffect(() => setTz(Intl.DateTimeFormat().resolvedOptions().timeZone || "Africa/Lagos"), []);

  // Jump to the first step that has a server-side error.
  useEffect(() => {
    if (!state?.errors) return;
    const first = STEP_FIELDS.findIndex((fields) => fields.some((f) => state.errors?.[f]));
    if (first >= 0) setStep(first);
  }, [state]);

  async function checkSponsor(code: string) {
    if (!code.trim()) return setSponsor({});
    setSponsor({ checking: true });
    const { data } = await createClient().rpc("lookup_sponsor", { code });
    const row = (data as { full_name: string; member_id: string }[] | null)?.[0];
    setSponsor(row ? { name: `${row.full_name} · ${row.member_id}` } : { invalid: true });
  }

  useEffect(() => { if (referralCode) void checkSponsor(referralCode); }, [referralCode]);

  function next() {
    // Use the browser's built-in validation for the fields on this step.
    const form = formRef.current;
    if (!form) return;
    const invalid = STEP_FIELDS[step]
      .map((name) => form.elements.namedItem(name))
      .find((el) => el instanceof HTMLInputElement || el instanceof HTMLSelectElement ? !el.checkValidity() : false) as HTMLInputElement | undefined;
    if (invalid) { invalid.reportValidity(); return; }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  if (state?.ok) {
    return (
      <div className="mt-8 rounded-3xl bg-success-soft p-6 text-center">
        <CircleCheck className="mx-auto size-10 text-success" aria-hidden />
        <h2 className="mt-3 text-lg font-semibold">Check your email</h2>
        <p className="mt-1 text-sm text-fg-muted">{state.message}</p>
        <Link href="/login" className="mt-5 inline-block font-semibold text-primary hover:underline">Go to sign in</Link>
      </div>
    );
  }

  return (
    <form ref={formRef} action={action} className="mt-8" noValidate>
      <ol className="mb-6 grid grid-cols-3 gap-2" aria-label="Registration progress">
        {STEPS.map((label, i) => (
          <li key={label} aria-current={i === step ? "step" : undefined}>
            <div className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-border")} />
            <p className={cn("mt-2 text-xs font-medium", i === step ? "text-fg" : "text-fg-subtle")}>{label}</p>
          </li>
        ))}
      </ol>

      <FormMessage state={state} />
      <input type="hidden" name="timezone" value={tz} />
      {uplineCode && <input type="hidden" name="upline_code" value={uplineCode} />}

      {/* Step 1 — personal details */}
      <fieldset className={cn("space-y-4", step !== 0 && "hidden")}>
        <legend className="sr-only">About you</legend>
        <div className="flex items-center gap-4">
          <label htmlFor="avatar" className="group relative grid size-20 cursor-pointer place-items-center overflow-hidden rounded-full bg-surface-muted ring-2 ring-border">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="Profile preview" className="size-full object-cover" />
            ) : (
              <UserRound className="size-8 text-fg-subtle" aria-hidden />
            )}
            <span className="absolute bottom-0 right-0 grid size-7 place-items-center rounded-full bg-primary text-white ring-2 ring-bg">
              <Camera className="size-3.5" aria-hidden />
            </span>
          </label>
          <div className="text-sm">
            <p className="font-medium">Profile picture <span className="font-normal text-fg-subtle">(optional)</span></p>
            <p className="text-fg-subtle">JPG, PNG or WebP, up to 2 MB.</p>
          </div>
          <input id="avatar" name="avatar" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f && f.size > 2 * 1024 * 1024) { e.target.value = ""; alert("Please choose an image under 2 MB."); return; }
              setPreview(f ? URL.createObjectURL(f) : null);
            }} />
        </div>
        <Field label="Full name" htmlFor="full_name" error={errors.full_name}>
          <Input id="full_name" name="full_name" autoComplete="name" required minLength={2} placeholder="e.g. Ada Okafor" />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Phone number" htmlFor="phone" error={errors.phone}>
            <Input id="phone" name="phone" type="tel" autoComplete="tel" required pattern="\+?[0-9\s\-]{7,20}" placeholder="+234 801 234 5678" />
          </Field>
          <Field label="WhatsApp number" htmlFor="whatsapp" error={errors.whatsapp}>
            <Input id="whatsapp" name="whatsapp" type="tel" required pattern="\+?[0-9\s\-]{7,20}" placeholder="+234 801 234 5678" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of birth" htmlFor="date_of_birth" error={errors.date_of_birth}>
            <Input id="date_of_birth" name="date_of_birth" type="date" required max={new Date().toISOString().slice(0, 10)} />
          </Field>
          <Field label="Gender" htmlFor="gender" optional error={errors.gender}>
            <Select id="gender" name="gender" defaultValue="">
              <option value="">Prefer not to say</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          </Field>
        </div>
        <label className="flex items-start gap-3 rounded-xl bg-surface-muted p-3 text-sm">
          <Checkbox name="celebrate_birthday" defaultChecked className="mt-0.5" />
          <span>
            <span className="font-medium">Celebrate my birthday with the team</span>
            <span className="block text-fg-muted">Only the day and month are shown — never your age. You can change this anytime.</span>
          </span>
        </label>
      </fieldset>

      {/* Step 2 — team placement */}
      <fieldset className={cn("space-y-4", step !== 1 && "hidden")}>
        <legend className="sr-only">Your team</legend>
        <Field label="Office" htmlFor="office_id" error={errors.office_id}
          hint={offices.length === 0 ? "No offices have been set up yet — ask your administrator." : undefined}>
          <Select id="office_id" name="office_id" required defaultValue="">
            <option value="" disabled>Choose your office</option>
            {offices.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
          </Select>
        </Field>
        <Field label="Sponsor referral code or Member ID" htmlFor="referral_code" error={errors.referral_code}
          hint={uplineCode ? "Optional: only if someone sponsored you." : "Ask the person who invited you. Leave blank only if you are the founding administrator."}>
          <Input id="referral_code" name="referral_code" defaultValue={referralCode} autoCapitalize="characters"
            placeholder="e.g. MX-001024" onBlur={(e) => checkSponsor(e.target.value)} aria-describedby="sponsor-status" />
        </Field>
        <p id="sponsor-status" className="-mt-2 text-sm" aria-live="polite">
          {sponsor.checking && <span className="text-fg-subtle">Checking…</span>}
          {sponsor.name && <span className="text-success">✓ Sponsor: {sponsor.name}</span>}
          {sponsor.invalid && <span className="text-danger">We couldn&apos;t find that code.</span>}
        </p>
        <Field label="Upline Member ID" htmlFor="upline_member_id" optional error={errors.upline_member_id}
          hint="Only if your upline is different from your sponsor.">
          <Input id="upline_member_id" name="upline_member_id" autoCapitalize="characters" placeholder="e.g. MX-001003" />
        </Field>
      </fieldset>

      {/* Step 3 — credentials & consent */}
      <fieldset className={cn("space-y-4", step !== 2 && "hidden")}>
        <legend className="sr-only">Your account</legend>
        <Field label="Email address" htmlFor="email" error={errors.email}>
          <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required placeholder="you@example.com" />
        </Field>
        <Field label="Password" htmlFor="password" error={errors.password} hint="At least 8 characters, with a letter and a number.">
          <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirm password" htmlFor="confirm_password" error={errors.confirm_password}>
          <PasswordInput id="confirm_password" name="confirm_password" autoComplete="new-password" required minLength={8} />
        </Field>
        <label className="flex items-start gap-3 text-sm">
          <Checkbox name="privacy" required className="mt-0.5" aria-invalid={Boolean(errors.privacy)} />
          <span>
            I agree to the <Link href="/privacy" target="_blank" className="font-medium text-primary hover:underline">privacy policy</Link> and
            consent to Maximus processing my details to manage my membership.
          </span>
        </label>
        {errors.privacy && <p className="text-sm text-danger" role="alert">{errors.privacy[0]}</p>}
      </fieldset>

      <div className="mt-8 flex gap-3">
        {step > 0 && (
          <Button variant="outline" size="lg" onClick={() => setStep((s) => s - 1)}>
            <ArrowLeft className="size-4" aria-hidden /> Back
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button size="lg" className="flex-1" onClick={next}>
            Continue <ArrowRight className="size-4" aria-hidden />
          </Button>
        ) : (
          <SubmitButton size="lg" className="flex-1" pendingLabel="Creating your account…">Create account</SubmitButton>
        )}
      </div>
    </form>
  );
}
