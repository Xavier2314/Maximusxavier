"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { PasswordInput } from "@/components/ui/password-input";
import { loginAction } from "../actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(loginAction, null);
  return (
    <form action={action} className="mt-8 space-y-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email address" htmlFor="email" error={state?.errors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" required
          aria-invalid={Boolean(state?.errors?.email)} placeholder="you@example.com" />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.errors?.password}>
        <PasswordInput id="password" name="password" autoComplete="current-password" required />
      </Field>
      <div className="flex justify-end">
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
      </div>
      <SubmitButton size="lg" className="w-full" pendingLabel="Signing in…">Sign in</SubmitButton>
    </form>
  );
}
