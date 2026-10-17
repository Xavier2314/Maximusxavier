"use client";

import { useActionState } from "react";
import { Field, FormMessage } from "@/components/ui/form";
import { PasswordInput } from "@/components/ui/password-input";
import { SubmitButton } from "@/components/ui/submit-button";
import { resetPasswordAction } from "../actions";

export default function ResetPasswordPage() {
  const [state, action] = useActionState(resetPasswordAction, null);
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Choose a new password</h1>
      <p className="mt-1 text-fg-muted">Use at least 8 characters with a letter and a number.</p>
      <form action={action} className="mt-8 space-y-5" noValidate>
        <FormMessage state={state} />
        <Field label="New password" htmlFor="password" error={state?.errors?.password}>
          <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm_password" error={state?.errors?.confirm_password}>
          <PasswordInput id="confirm_password" name="confirm_password" autoComplete="new-password" required minLength={8} />
        </Field>
        <SubmitButton size="lg" className="w-full" pendingLabel="Saving…">Update password</SubmitButton>
      </form>
    </>
  );
}
