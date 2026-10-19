"use client";

import { useActionState, useState } from "react";
import { FileUp } from "lucide-react";
import { Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createFunnelFromHtmlAction } from "../html-actions";

export function ImportForm() {
  const [state, action] = useActionState(createFunnelFromHtmlAction, null);
  const [html, setHtml] = useState("");
  const [mode, setMode] = useState<"keep" | "ai">("keep");
  const [fileMsg, setFileMsg] = useState("");
  async function pick(f: File | undefined) {
    if (!f) return;
    if (f.size > 500_000) { setFileMsg("That file is over 500 KB."); return; }
    setHtml(await f.text()); setFileMsg(`Loaded ${f.name}`);
  }
  return (
    <form action={action} className="space-y-4">
      <Field label="Funnel name" htmlFor="imp-name"><Input id="imp-name" name="name" maxLength={80} required placeholder="e.g. My product page" /></Field>
      <Field label="Your page's HTML" htmlFor="imp-html" hint="Paste the full page source, or upload an .html file. Scripts and tracking code are removed for safety.">
        <Textarea id="imp-html" name="html" rows={12} value={html} onChange={(e) => setHtml(e.target.value)} className="font-mono text-xs" placeholder="<html>…</html>" required />
      </Field>
      <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border px-3 text-sm font-medium hover:bg-surface-muted"><FileUp className="size-4" aria-hidden />Upload an .html file<input type="file" accept=".html,.htm,text/html" hidden onChange={(e) => pick(e.target.files?.[0])} /></label>
      {fileMsg && <span className="ml-2 text-sm text-fg-muted">{fileMsg}</span>}
      <fieldset className="grid gap-2 sm:grid-cols-2">
        <legend className="mb-1 text-sm font-medium">How should it be imported?</legend>
        {([["keep", "Keep my layout", "Closest to your page: its sections, columns, text, pictures and forms."], ["ai", "Rebuild beautifully with AI", "AI keeps all your real words, pictures and links and redesigns the page in one of our styles."]] as const).map(([k, t, d]) => (
          <label key={k} className={`flex cursor-pointer gap-3 rounded-xl border p-3 text-sm ${mode === k ? "border-primary bg-primary-soft" : "border-border"}`}>
            <input type="radio" name="mode" value={k} checked={mode === k} onChange={() => setMode(k)} className="mt-1" />
            <span><b>{t}</b><br /><span className="text-fg-muted">{d}</span></span>
          </label>
        ))}
      </fieldset>
      <p className="text-xs text-fg-muted">Not carried over: your own CSS and fonts, scripts, menus, and pictures that only exist inside the file (upload those in the builder). Forms become our forms, so leads and orders land in your inbox here.</p>
      <FormMessage state={state} />
      <SubmitButton pendingLabel={mode === "ai" ? "Importing and redesigning… (up to a minute)" : "Importing…"}>Create my funnel</SubmitButton>
    </form>
  );
}
