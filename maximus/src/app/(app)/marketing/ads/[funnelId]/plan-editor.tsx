"use client";

import { useEffect, useState, useTransition } from "react";
import { AlertTriangle, Check, Copy, Film, ImageIcon, ShieldCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/form";
import { CTAS, CTA_LABEL, OBJECTIVES, conceptIssues, trackedUrl, type AdPlan, type Concept, type Cta } from "@/lib/ad-plan";
import { hasBlocking, productChecks } from "@/lib/ad-rules";
import { deleteAdPlanAction, saveAdPlanAction } from "../actions";

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  return (
    <Button size="sm" variant="ghost" onClick={async () => { try { await navigator.clipboard.writeText(text); setDone(true); setTimeout(() => setDone(false), 1500); } catch { /* clipboard blocked */ } }}>
      {done ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}{done ? "Copied" : label}
    </Button>
  );
}

const adText = (c: Concept) => `${c.primaryText}\n\nHeadline: ${c.headline}\nDescription: ${c.description}\nButton: ${CTA_LABEL[c.cta]}`;

export function PlanEditor({ planId, funnelId, slug, published, initial, hasWhatsapp }: {
  planId: string; funnelId: string; slug: string; published: boolean; initial: AdPlan; hasWhatsapp: boolean;
}) {
  const [plan, setPlan] = useState<AdPlan>(initial);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState("");
  const [saving, start] = useTransition();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const setConcept = (i: number, patch: Partial<Concept>) => { setPlan((p) => ({ ...p, concepts: p.concepts.map((c, k) => (k === i ? { ...c, ...patch } : c)) })); setDirty(true); setMsg(""); };
  const blocked = plan.concepts.some((c) => hasBlocking(conceptIssues(c)));
  const checks = productChecks({ healthProduct: plan.inputs.healthProduct, registrationNumber: plan.inputs.registrationNumber });
  const obj = OBJECTIVES.find((o) => o.key === plan.inputs.objective);

  const save = () => start(async () => { const r = await saveAdPlanAction(planId, JSON.stringify(plan)); setMsg(r?.message ?? ""); if (r?.ok) setDirty(false); });

  return (
    <div className="space-y-6">
      <div className={`flex flex-wrap items-center gap-3 rounded-2xl border p-4 text-sm ${blocked ? "border-danger bg-danger/10" : "border-success bg-success/10"}`} role="status">
        {blocked ? <AlertTriangle className="size-5 shrink-0 text-danger" aria-hidden /> : <ShieldCheck className="size-5 shrink-0 text-success" aria-hidden />}
        <p className="min-w-0 flex-1">{blocked ? "Some ads break Facebook's advertising rules. Fix the red items before you use them, or the ad or your account can be restricted." : "All ads pass the automatic rule check. This is a safety net, not a guarantee: Facebook makes the final decision."}</p>
        <Button size="sm" onClick={save} disabled={!dirty || saving}>{saving ? "Saving…" : dirty ? "Save changes" : "Saved"}</Button>
        {msg && <span className="text-xs">{msg}</span>}
      </div>

      {!published && <p className="rounded-xl border border-warning bg-warning/10 p-3 text-sm" role="alert">Your funnel is not published yet, so these links won&apos;t work. Publish it in the builder before you run any ad.</p>}

      <section className="grid gap-4 lg:grid-cols-2" aria-label="Audience and budget">
        <div className="space-y-2 rounded-2xl border border-border p-4 text-sm">
          <h3 className="text-base font-semibold">Who to show it to</h3>
          <p><b>Places:</b> {plan.audience.locations.join(", ") || plan.inputs.areas}</p>
          <p><b>Age:</b> {plan.audience.ageMin} to {plan.audience.ageMax}{plan.audience.gender !== "all" ? `, ${plan.audience.gender} only` : ", everyone"}</p>
          {plan.audience.interests.length > 0 && <p><b>Interest ideas:</b> {plan.audience.interests.join(", ")}</p>}
          {plan.audience.notes && <p className="text-fg-muted">{plan.audience.notes}</p>}
        </div>
        <div className="space-y-2 rounded-2xl border border-border p-4 text-sm">
          <h3 className="text-base font-semibold">Budget</h3>
          <p><b>₦{plan.budget.dailyNgn.toLocaleString("en-NG")} a day</b> for {plan.budget.testDays} days to test (before tax). Goal: {obj?.label.toLowerCase()}.</p>
          <p className="text-fg-muted">{plan.budget.rationale}</p>
        </div>
      </section>

      <section className="space-y-4" aria-label="Ads">
        <h3 className="text-base font-semibold">Your ads ({plan.concepts.length} different ideas)</h3>
        {plan.concepts.map((c, i) => {
          const issues = conceptIssues(c);
          const link = c.cta === "WHATSAPP_MESSAGE" ? "" : trackedUrl(origin, slug, planId, c.id);
          return (
            <article key={c.id} className="space-y-3 rounded-2xl border border-border p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-primary">{c.format === "video" ? <Film className="size-3.5" /> : <ImageIcon className="size-3.5" />}{c.format === "video" ? "Video" : "Image"}</span>
                <h4 className="font-semibold">{c.name}</h4>
                <span className="ml-auto"><CopyButton text={adText(c)} label="Copy ad text" /></span>
              </div>
              {c.angle && <p className="text-sm text-fg-muted">{c.angle}</p>}
              {issues.length > 0 && (
                <ul className="space-y-1.5" aria-label="Rule check">
                  {issues.map((it) => (
                    <li key={it.id} className={`rounded-lg px-3 py-2 text-sm ${it.severity === "block" ? "bg-danger/10 text-danger" : "bg-warning/10"}`}>
                      <b>{it.severity === "block" ? "Fix this:" : "Check this:"}</b> {it.message} <span className="opacity-80">(“{it.match}”)</span> <br /><span className="text-fg-muted">{it.fix}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Field label="Main text" htmlFor={`pt-${c.id}`} hint={`${c.primaryText.length}/900. The first line is what people see before “See more”.`}>
                <Textarea id={`pt-${c.id}`} rows={5} value={c.primaryText} maxLength={900} onChange={(e) => setConcept(i, { primaryText: e.target.value })} />
              </Field>
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Headline" htmlFor={`h-${c.id}`} hint={`${c.headline.length}/40 works best`}><Input id={`h-${c.id}`} value={c.headline} maxLength={60} onChange={(e) => setConcept(i, { headline: e.target.value })} /></Field>
                <Field label="Description" htmlFor={`d-${c.id}`}><Input id={`d-${c.id}`} value={c.description} maxLength={90} onChange={(e) => setConcept(i, { description: e.target.value })} /></Field>
                <Field label="Button" htmlFor={`b-${c.id}`}><Select id={`b-${c.id}`} value={c.cta} onChange={(e) => setConcept(i, { cta: e.target.value as Cta })}>{CTAS.map((k) => <option key={k} value={k}>{CTA_LABEL[k]}</option>)}</Select></Field>
              </div>
              <div className="space-y-1.5 rounded-xl bg-surface-muted p-3 text-sm">
                <p className="font-semibold">{c.format === "video" ? "Video to make" : "Picture to make"}</p>
                <p>{c.creativeBrief}</p>
                {c.video && (
                  <div className="space-y-1">
                    <p><b>First 3 seconds:</b> {c.video.hook}</p>
                    <ol className="list-decimal space-y-0.5 pl-5">{c.video.scenes.map((s, k) => <li key={k}>{s}</li>)}</ol>
                    {c.video.voiceover && <p><b>Say:</b> {c.video.voiceover}</p>}
                    {c.video.onScreenText && <p><b>Text on screen:</b> {c.video.onScreenText}</p>}
                    <p className="text-fg-muted">About {c.video.lengthSec} seconds, upright (9:16), captions on, filmed with your real product.</p>
                  </div>
                )}
              </div>
              {link ? (
                <div className="flex flex-wrap items-center gap-2 text-xs"><code className="min-w-0 flex-1 break-all rounded bg-surface-muted px-2 py-1">{link}</code><CopyButton text={link} label="Copy link" /></div>
              ) : <p className="text-xs text-fg-muted">This ad opens a WhatsApp chat. {hasWhatsapp ? "Use your WhatsApp number when you set it up." : "Add your WhatsApp number to your profile first."}</p>}
            </article>
          );
        })}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-2xl border border-border p-4 text-sm">
          <h3 className="text-base font-semibold">Before you run anything</h3>
          <ul className="space-y-1.5">
            {checks.map((k, i) => <li key={i} className="flex gap-2">{k.ok ? <Check className="mt-0.5 size-4 shrink-0 text-success" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0 text-danger" />}<span>{k.text}</span></li>)}
            <li className="flex gap-2"><Checkbox aria-label="I have my own real photos and videos" /><span>Use your own real product photos and videos. Never use fake reviews, fake customers or someone else&apos;s pictures.</span></li>
            <li className="flex gap-2"><Checkbox aria-label="Dollar card ready" /><span>Facebook charges your ad account directly. Nigerian naira cards are often declined for ads, so have a dollar virtual or domiciliary card ready. Facebook adds VAT on top of your budget.</span></li>
          </ul>
        </div>
        <div className="space-y-2 rounded-2xl border border-border p-4 text-sm">
          <h3 className="text-base font-semibold">How to test it</h3>
          <ol className="list-decimal space-y-1.5 pl-5">{plan.testing.map((t, i) => <li key={i}>{t}</li>)}</ol>
        </div>
      </section>

      <section className="space-y-2 rounded-2xl border border-border p-4 text-sm">
        <h3 className="text-base font-semibold">Put it live on Facebook</h3>
        <p>For now, create the ads in Facebook Ads Manager and paste in the text, links and pictures above. Each link is tagged, so every lead and order on your funnel shows which ad brought it.</p>
        <p className="text-fg-muted"><b>Coming next:</b> connect your Facebook account so the ads are created and published for you, with your approval on each ad. This needs Facebook&apos;s approval of our app first, so it is not switched on yet.</p>
      </section>

      <form action={deleteAdPlanAction.bind(null, funnelId, planId)} onSubmit={(e) => { if (!confirm("Delete this ad plan?")) e.preventDefault(); }}>
        <Button type="submit" size="sm" variant="ghost" className="text-danger"><Trash2 className="size-4" />Delete this plan</Button>
      </form>
    </div>
  );
}
