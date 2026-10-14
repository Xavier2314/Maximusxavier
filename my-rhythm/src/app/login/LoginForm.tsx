"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Card, Field, Input } from "@/components/ui";

export function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "link">("password");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "info"; text: string } | null>(
    params.get("denied") ? { kind: "error", text: "This account isn't allowed to use this private app." } :
    params.get("setup") ? { kind: "info", text: "The server isn't configured yet. Add your Supabase keys (see README → Deployment)." } : null,
  );
  const next = params.get("next") || "/";

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    try {
      const sb = createClient();
      if (mode === "password") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = next.startsWith("/") ? next : "/";
      } else {
        const { error } = await sb.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: false, emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
        });
        if (error) throw error;
        setMsg({ kind: "info", text: "Check your email for a sign-in link. Open it on this device." });
      }
    } catch (err) {
      setMsg({ kind: "error", text: err instanceof Error ? err.message : "Sign-in failed" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="p-5">
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email">
          <Input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        {mode === "password" && (
          <Field label="Password">
            <Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
        )}
        {msg && <p className={msg.kind === "error" ? "text-sm text-danger" : "text-sm text-ink-2"} role="status">{msg.text}</p>}
        <Button type="submit" className="w-full" loading={loading}>{mode === "password" ? "Sign in" : "Email me a sign-in link"}</Button>
        <button type="button" className="w-full text-center text-sm text-lavender" onClick={() => setMode(mode === "password" ? "link" : "password")}>
          {mode === "password" ? "Use a magic link instead" : "Use password instead"}
        </button>
      </form>
    </Card>
  );
}
