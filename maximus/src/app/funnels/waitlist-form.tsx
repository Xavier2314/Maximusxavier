"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form";

export function WaitlistForm() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    setBusy(true);
    setMsg(null);
    // Insert-only: the funnel_waitlist RLS policy lets anyone add a row but not read any back.
    const { error } = await createClient().from("funnel_waitlist").insert({
      email: String(fd.get("email") ?? "").trim(),
      name: String(fd.get("name") ?? "").trim() || null,
      package_interest: String(fd.get("pkg") ?? "") || null,
    });
    setBusy(false);
    // 23505 = already on the list, which is fine from the visitor's side.
    if (!error || error.code === "23505") {
      setMsg({ ok: true, text: "You're on the list. We'll email you at launch." });
      form.reset();
    } else {
      setMsg({ ok: false, text: "Something went wrong. Please try again." });
    }
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto mt-8 flex max-w-lg flex-wrap gap-2">
      <Input name="name" placeholder="Your name (optional)" maxLength={120} autoComplete="name" className="flex-1 basis-48" />
      <Input name="email" type="email" placeholder="Email address" required maxLength={254} autoComplete="email" className="flex-1 basis-48" />
      <Select name="pkg" aria-label="Package of interest" className="flex-1 basis-48" defaultValue="">
        <option value="">Package of interest</option>
        <option value="starter">Starter</option>
        <option value="growth">Growth</option>
        <option value="pro">Pro</option>
      </Select>
      <Button type="submit" disabled={busy}>{busy ? "Saving…" : "Join waitlist"}</Button>
      <p role="status" className={`min-h-6 w-full text-sm ${msg?.ok === false ? "text-danger" : "text-fg-muted"}`}>{msg?.text}</p>
    </form>
  );
}
