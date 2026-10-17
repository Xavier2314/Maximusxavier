"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowLeft } from "lucide-react";
import { Field, FormMessage, Input } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { forgotPasswordAction } from "../actions";

export default function ForgotPasswordPage() {
  const [state, action] = useActionState(forgotPasswordAction, null);
  return (
    <>
      <Link href="/login" className="mb-6 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Back to sign in
      </Link>
      <h1 className="text-3xl font-bold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-fg-muted">Enter your email and we&apos;ll send you a secure reset link.</p>
      <form action={action} className="mt-8 space-y-5" noValidate>
        <FormMessage state={state} />
        <Field label="Email address" htmlFor="email" error={state?.errors?.email}>
          <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
        </Field>
        <SubmitButton size="lg" className="w-full" pendingLabel="Sending…">Send reset link</SubmitButton>
      </form>
    </>
  );
}
