"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, RefreshCw, Share2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { projectsToText, servicesToText, type Portfolio } from "@/lib/portfolio";
import { createPortfolioAction, deletePortfolioAction, rebuildPortfolioAction, savePortfolioAction } from "./actions";

export function CreatePortfolioForm({ first = false }: { first?: boolean }) {
  const [state, action] = useActionState(createPortfolioAction, null);
  return (
    <form action={action} className="space-y-3 text-left">
      <FormMessage state={state} />
      {!first && (
        <Field label="What is this site for?" htmlFor="focus"><Input id="focus" name="focus" required maxLength={60} placeholder="e.g. Logo design" /></Field>
      )}
      <SubmitButton className="h-12 w-full text-base font-semibold" pendingLabel="Building your website… (up to a minute)">
        <Sparkles className="size-5" aria-hidden />{first ? "Create my website automatically" : "Create this website"}
      </SubmitButton>
    </form>
  );
}

export function ShareSite({ url, name }: { url: string; name: string }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    if (navigator.share) await navigator.share({ title: name, text: `See my work: ${name}`, url }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(`See my work: ${url}`)}`, "_blank", "noopener");
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button onClick={share}><Share2 className="size-4" aria-hidden />Share</Button>
      <Button variant="outline" onClick={async () => { try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ } }}>
        {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}{copied ? "Copied" : "Copy link"}
      </Button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-muted">View my site</a>
    </div>
  );
}

export function PortfolioEditor({ site }: { site: Portfolio }) {
  const [state, action] = useActionState(savePortfolioAction, null);
  const [pending, start] = useTransition();
  const [note, setNote] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div className="space-y-4">
      <FormMessage state={note ?? state} />
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" disabled={pending} onClick={() => start(async () => setNote(await rebuildPortfolioAction(site.id)))}>
          <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden />{pending ? "Rebuilding…" : "Rebuild with AI"}
        </Button>
        <Button variant="ghost" disabled={pending}
          onClick={() => { if (confirm("Delete this website? The link will stop working.")) start(() => deletePortfolioAction(site.id)); }}>
          <Trash2 className="size-4" aria-hidden />Delete
        </Button>
      </div>
      <form key={site.updated_at} action={action} className="space-y-4">
        <input type="hidden" name="id" value={site.id} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Website link name" htmlFor="slug" hint={`/p/${site.slug}`}><Input id="slug" name="slug" required defaultValue={site.slug} /></Field>
          <Field label="Site label (only you see it)" htmlFor="title"><Input id="title" name="title" maxLength={60} defaultValue={site.title ?? ""} /></Field>
        </div>
        <Field label="Headline" htmlFor="headline"><Input id="headline" name="headline" maxLength={140} defaultValue={site.headline ?? ""} /></Field>
        <Field label="About me" htmlFor="bio"><Textarea id="bio" name="bio" rows={6} maxLength={2000} defaultValue={site.bio ?? ""} /></Field>
        <Field label="Skills" htmlFor="skills" hint="Separate with commas."><Input id="skills" name="skills" defaultValue={site.skills.join(", ")} /></Field>
        <Field label="Services" htmlFor="services" hint="One per line: Title | Price | Description">
          <Textarea id="services" name="services" rows={5} defaultValue={servicesToText(site.services)} />
        </Field>
        <Field label="Work samples" htmlFor="projects" hint="One per line: Title | Link (optional) | Description">
          <Textarea id="projects" name="projects" rows={6} defaultValue={projectsToText(site.projects)} />
        </Field>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm"><Checkbox name="published" defaultChecked={site.published} />Website is live</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox name="show_whatsapp" defaultChecked={site.show_whatsapp} />Show my WhatsApp button</label>
          <label className="flex items-center gap-2 text-sm"><Checkbox name="show_email" defaultChecked={site.show_email} />Show my email</label>
          <label className="flex items-center gap-2 text-sm">Colour <input type="color" name="accent" defaultValue={site.accent ?? "#2563eb"} className="h-8 w-12 cursor-pointer rounded border border-border" /></label>
        </div>
        <SubmitButton className="w-full" pendingLabel="Saving…">Save website</SubmitButton>
      </form>
    </div>
  );
}
