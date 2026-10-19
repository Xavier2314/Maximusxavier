"use client";

import { useActionState, useState, useTransition } from "react";
import { Check, Copy, ImagePlus, LoaderCircle, RefreshCw, Share2, Sparkles, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  DEFAULT_DESIGN, SECTIONS, SOCIALS, projectsToText, servicesToText, type Design, type Portfolio, type PortfolioBlock, type SectionKey, type Socials,
} from "@/lib/portfolio";
import { createPortfolioAction, deletePortfolioAction, rebuildPortfolioAction, savePortfolioAction } from "./actions";
import { MediaEditor, uploadPortfolioFile } from "./media-editor";

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
  const [blocks, setBlocks] = useState<PortfolioBlock[]>(site.blocks ?? []);
  const [socials, setSocials] = useState<Socials>(site.socials ?? {});
  const [design, setDesign] = useState<Design>({ ...DEFAULT_DESIGN, hide: [], ...(site.design ?? {}) });
  const [coverBusy, setCoverBusy] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);
  const hidden = new Set(design.hide ?? []);
  const toggleSection = (k: SectionKey) => setDesign((d) => {
    const h = new Set(d.hide ?? []);
    if (h.has(k)) h.delete(k); else h.add(k);
    return { ...d, hide: [...h] };
  });
  async function onCover(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) { setCoverError("Choose an image for the cover."); return; }
    setCoverBusy(true); setCoverError(null);
    try { const url = await uploadPortfolioFile(site.user_id, site.id, file); setDesign((d) => ({ ...d, cover_url: url })); }
    catch (e) { setCoverError((e as Error).message); }
    finally { setCoverBusy(false); }
  }
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
        <input type="hidden" name="blocks" value={JSON.stringify(blocks)} />
        <input type="hidden" name="socials" value={JSON.stringify(socials)} />
        <input type="hidden" name="design" value={JSON.stringify(design)} />
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

        <fieldset className="space-y-3 rounded-2xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Portfolio: images, videos, files and text</legend>
          <MediaEditor userId={site.user_id} siteId={site.id} blocks={blocks} onChange={setBlocks} />
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Social media</legend>
          <p className="text-xs text-fg-subtle">Add a link or @username. Only the ones you fill in show on your site.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {SOCIALS.map((s) => (
              <Field key={s.key} label={s.label} htmlFor={`social-${s.key}`}>
                <Input id={`social-${s.key}`} value={socials[s.key] ?? ""} maxLength={300}
                  placeholder={s.base ? "@username or link" : "https://…"}
                  onChange={(e) => setSocials((o) => ({ ...o, [s.key]: e.target.value }))} />
              </Field>
            ))}
          </div>
        </fieldset>

        <fieldset className="space-y-3 rounded-2xl border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Customise your page</legend>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Theme" htmlFor="d-mode">
              <Select id="d-mode" value={design.mode} onChange={(e) => setDesign((d) => ({ ...d, mode: e.target.value as Design["mode"] }))}>
                <option value="light">Light</option><option value="dark">Dark</option>
              </Select>
            </Field>
            <Field label="Layout" htmlFor="d-layout">
              <Select id="d-layout" value={design.layout} onChange={(e) => setDesign((d) => ({ ...d, layout: e.target.value as Design["layout"] }))}>
                <option value="center">Centred</option><option value="left">Left aligned</option>
              </Select>
            </Field>
            <Field label="Font" htmlFor="d-font">
              <Select id="d-font" value={design.font} onChange={(e) => setDesign((d) => ({ ...d, font: e.target.value as Design["font"] }))}>
                <option value="modern">Modern</option><option value="classic">Classic (serif)</option>
              </Select>
            </Field>
          </div>
          <Field label="Main button text" htmlFor="d-btn" hint="For example: Book a call, Hire me, Get a quote.">
            <Input id="d-btn" value={design.button_text ?? ""} maxLength={40} placeholder="Hire me on WhatsApp"
              onChange={(e) => setDesign((d) => ({ ...d, button_text: e.target.value }))} />
          </Field>
          <div className="space-y-2">
            <p className="text-sm font-medium">Cover image</p>
            {design.cover_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={design.cover_url} alt="" className="h-28 w-full rounded-xl object-cover" />
            )}
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-muted">
                {coverBusy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
                {coverBusy ? "Uploading…" : design.cover_url ? "Change cover" : "Upload cover"}
                <input type="file" accept="image/*" hidden disabled={coverBusy} onChange={(e) => { onCover(e.target.files?.[0]); e.target.value = ""; }} />
              </label>
              {design.cover_url && <Button variant="ghost" onClick={() => setDesign((d) => ({ ...d, cover_url: null }))}>Remove cover</Button>}
            </div>
            {coverError && <p className="text-sm text-danger" role="alert">{coverError}</p>}
          </div>
          <div>
            <p className="mb-2 text-sm font-medium">Sections to show</p>
            <div className="grid gap-2 sm:grid-cols-3">
              {SECTIONS.map((s) => (
                <label key={s.key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={!hidden.has(s.key)} onChange={() => toggleSection(s.key)} />{s.label}
                </label>
              ))}
            </div>
          </div>
        </fieldset>
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
