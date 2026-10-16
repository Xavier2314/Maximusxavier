"use client";
import { useActionState } from "react";
import { login } from "@/lib/admin-actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);
  return (
    <form action={action} className="space-y-5">
      <div>
        <label htmlFor="password" className="field-label">Admin password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required className="field" aria-invalid={state?.error ? true : undefined} />
      </div>
      {state?.error && <p role="alert" className="field-error">{state.error}</p>}
      <button className="btn btn-navy w-full" disabled={pending}>{pending ? "Signing in" : "Sign in"}</button>
    </form>
  );
}
