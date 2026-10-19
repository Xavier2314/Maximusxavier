"use client";

import { useActionState, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Sparkles, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Checkbox, Field, FormMessage, Input, Select, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { ImageField } from "@/components/funnels/image-upload";
import { StyleThumb } from "@/components/funnels/style-thumb";
import { STYLES } from "@/lib/funnel-styles";
import { starterPages } from "@/lib/funnel-templates";
import { EMPTY_PRODUCT, FUNNEL_TYPES, STYLE_KEYS, type FunnelProduct, type FunnelType, type StyleKey } from "@/lib/funnels";
import { createFunnelAction } from "../actions";

const STEPS = ["Your product", "Funnel type", "Pick a look", "Build it"];
const TONES = ["friendly and confident", "bold and energetic", "premium and elegant", "calm and caring", "fun and playful"];

export function Wizard({ userId }: { userId: string }) {
  const [state, action] = useActionState(createFunnelAction, null);
  const [step, setStep] = useState(0);
  const [p, setP] = useState<FunnelProduct>(EMPTY_PRODUCT);
  const [style, setStyle] = useState<StyleKey | "auto">("auto");
  const [mode, setMode] = useState<"ai" | "template">("ai");
  const [tone, setTone] = useState(TONES[0]);
  const set = <K extends keyof FunnelProduct>(k: K, v: FunnelProduct[K]) => setP((x) => ({ ...x, [k]: v }));

  // Real draft of this product, so the looks below are previewed with the seller's own words.
  const sample = useMemo(() => starterPages(p.funnelType, p)[0], [p]);
  const stepOk = [p.name.trim().length > 0, true, true, mode === "template" || p.description.trim().length >= 10 || p.benefits.trim().length >= 10];

  return (
    <form action={action} className="mx-auto max-w-4xl space-y-6">
      <input type="hidden" name="name" value={p.name} /><input type="hidden" name="price" value={p.price} /><input type="hidden" name="description" value={p.description} />
      <input type="hidden" name="benefits" value={p.benefits} /><input type="hidden" name="audience" value={p.audience} /><input type="hidden" name="offer" value={p.offer} />
      <input type="hidden" name="imageUrl" value={p.imageUrl} /><input type="hidden" name="funnelType" value={p.funnelType} /><input type="hidden" name="style" value={style} />
      <input type="hidden" name="mode" value={mode} /><input type="hidden" name="tone" value={tone} />
      {p.whatsapp && <input type="hidden" name="whatsapp" value="on" />}

      <ol className="flex items-center gap-2 overflow-x-auto pb-1" aria-label="Steps">
        {STEPS.map((s, i) => (
          <li key={s} className="flex items-center gap-2">
            <button type="button" disabled={i > step} onClick={() => setStep(i)} className={`flex items-center gap-2 rounded-full py-1 pl-1 pr-3 text-sm font-semibold ${i === step ? "bg-primary text-primary-fg" : i < step ? "bg-primary-soft text-primary" : "bg-surface-muted text-fg-subtle"}`}>
              <span className="grid size-6 place-items-center rounded-full bg-white/20 text-xs">{i < step ? <Check className="size-3.5" /> : i + 1}</span>{s}
            </button>
            {i < STEPS.length - 1 && <span className="h-px w-4 bg-border" aria-hidden />}
          </li>
        ))}
      </ol>

      <Card>
        <CardBody className="space-y-5 sm:p-8">
          {step === 0 && (
            <>
              <div><h2 className="text-xl font-bold">Tell us about your product</h2><p className="mt-1 text-sm text-fg-muted">The AI only uses what you write here, so be specific and truthful.</p></div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product name" htmlFor="w-name"><Input id="w-name" value={p.name} maxLength={120} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Daily Wellness Pack" autoFocus /></Field>
                <Field label="Price" htmlFor="w-price" optional hint="Type it the way customers should see it, e.g. ₦25,000"><Input id="w-price" value={p.price} maxLength={40} onChange={(e) => set("price", e.target.value)} placeholder="₦25,000" /></Field>
              </div>
              <Field label="What is it?" htmlFor="w-desc" hint="What it is, what is in it and how it is used."><Textarea id="w-desc" rows={3} value={p.description} maxLength={2000} onChange={(e) => set("description", e.target.value)} /></Field>
              <Field label="Benefits and selling points" htmlFor="w-ben" hint="One per line."><Textarea id="w-ben" rows={4} value={p.benefits} maxLength={2000} onChange={(e) => set("benefits", e.target.value)} placeholder={"Easy to use every day\nMade for busy people\n30-day supply per pack"} /></Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Who is it for?" htmlFor="w-aud" optional><Input id="w-aud" value={p.audience} maxLength={300} onChange={(e) => set("audience", e.target.value)} placeholder="e.g. Busy parents and professionals" /></Field>
                <Field label="Offer or bonus" htmlFor="w-offer" optional><Input id="w-offer" value={p.offer} maxLength={400} onChange={(e) => set("offer", e.target.value)} placeholder="e.g. Free delivery in Lagos this week" /></Field>
              </div>
              <Field label="Product photo" htmlFor="w-img" optional hint="A clear photo makes the funnel look much better."><ImageField id="w-img" userId={userId} value={p.imageUrl} onChange={(u) => set("imageUrl", u)} /></Field>
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={p.whatsapp} onChange={(e) => set("whatsapp", e.target.checked)} />Offer a &quot;Message us on WhatsApp&quot; button after an order</label>
            </>
          )}

          {step === 1 && (
            <>
              <div><h2 className="text-xl font-bold">What should your funnel do?</h2><p className="mt-1 text-sm text-fg-muted">A funnel is a short path of pages that guides a visitor to one action.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {FUNNEL_TYPES.map((t) => {
                  const on = p.funnelType === t.key;
                  return (
                    <button key={t.key} type="button" onClick={() => set("funnelType", t.key as FunnelType)} className={`rounded-2xl border-2 p-4 text-left transition ${on ? "border-primary bg-primary-soft" : "border-border hover:border-fg-subtle"}`}>
                      <span className="flex items-center justify-between"><span className="font-bold">{t.name}</span>{on && <Check className="size-4 text-primary" />}</span>
                      <span className="mt-1 block text-sm text-fg-muted">{t.blurb}</span>
                      <span className="mt-3 flex flex-wrap items-center gap-1.5 text-xs font-medium">
                        {t.steps.map((s, i) => <span key={s} className="flex items-center gap-1.5"><span className="rounded-full bg-surface-muted px-2.5 py-1">{s}</span>{i < t.steps.length - 1 && <ArrowRight className="size-3 text-fg-subtle" />}</span>)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div><h2 className="text-xl font-bold">Pick a look</h2><p className="mt-1 text-sm text-fg-muted">Previewed with your own product. You can switch looks any time inside the builder.</p></div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <button type="button" onClick={() => setStyle("auto")} className={`flex flex-col justify-between rounded-2xl border-2 p-4 text-left ${style === "auto" ? "border-primary bg-primary-soft" : "border-border hover:border-fg-subtle"}`} style={{ minHeight: 230 }}>
                  <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-fg"><Wand2 className="size-6" /></span>
                  <span><span className="block font-bold">Let AI choose</span><span className="text-sm text-fg-muted">The AI picks the look and colours that fit your product best.</span></span>
                  {style === "auto" && <Check className="size-5 text-primary" />}
                </button>
                {STYLE_KEYS.map((k) => (
                  <button key={k} type="button" onClick={() => setStyle(k)} className={`overflow-hidden rounded-2xl border-2 text-left transition ${style === k ? "border-primary shadow-md" : "border-border hover:border-fg-subtle"}`}>
                    <StyleThumb styleKey={k} page={sample} height={176} />
                    <span className="flex items-start justify-between gap-2 border-t border-border bg-surface p-3">
                      <span><span className="block text-sm font-bold">{STYLES[k].name}</span><span className="line-clamp-2 text-xs text-fg-subtle">{STYLES[k].blurb}</span></span>
                      {style === k && <Check className="size-4 shrink-0 text-primary" />}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div><h2 className="text-xl font-bold">Ready to build</h2><p className="mt-1 text-sm text-fg-muted">Choose how to start. Either way you can change everything in the builder.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                {([["ai", "Design it with AI", "The AI writes every headline and section for your product and lays the pages out. Takes up to a minute.", Sparkles], ["template", "Start from a template", "A ready-made draft filled with your details. Instant, no AI.", Wand2]] as const).map(([k, t, d, Icon]) => (
                  <button key={k} type="button" onClick={() => setMode(k)} className={`rounded-2xl border-2 p-4 text-left ${mode === k ? "border-primary bg-primary-soft" : "border-border hover:border-fg-subtle"}`}>
                    <Icon className="size-6 text-primary" /><span className="mt-2 block font-bold">{t}</span><span className="text-sm text-fg-muted">{d}</span>
                  </button>
                ))}
              </div>
              {mode === "ai" && (
                <Field label="How should it sound?" htmlFor="w-tone"><Select id="w-tone" value={tone} onChange={(e) => setTone(e.target.value)}>{TONES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
              )}
              <div className="rounded-2xl bg-surface-muted p-4 text-sm text-fg-muted">
                <b className="text-fg">{p.name || "Your product"}</b> · {FUNNEL_TYPES.find((t) => t.key === p.funnelType)?.name} · {style === "auto" ? "AI chooses the look" : STYLES[style].name}
              </div>
              {mode === "ai" && !stepOk[3] && <p role="alert" className="text-sm text-danger">Go back and describe the product or its benefits, so the AI has something true to write about.</p>}
              <FormMessage state={state} />
            </>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} className={step === 0 ? "invisible" : ""}><ArrowLeft className="size-4" />Back</Button>
            {step < 3 ? (
              <Button onClick={() => setStep((s) => s + 1)} disabled={!stepOk[step]}>Continue<ArrowRight className="size-4" /></Button>
            ) : (
              <SubmitButton className="h-12 px-6 text-base font-semibold" disabled={!stepOk[3] || !p.name.trim()} pendingLabel={mode === "ai" ? "AI is designing your funnel… (up to a minute)" : "Creating…"}>
                <Sparkles className="size-5" aria-hidden />{mode === "ai" ? "Design my funnel" : "Create my funnel"}
              </SubmitButton>
            )}
          </div>
        </CardBody>
      </Card>
    </form>
  );
}
