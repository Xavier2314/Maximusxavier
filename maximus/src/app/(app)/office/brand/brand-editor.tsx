"use client";

import { startTransition, useActionState, useMemo, useState, useTransition } from "react";
import { Check, ImagePlus, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input } from "@/components/ui/form";
import { brandProblems, brandVars, type Brand } from "@/lib/branding";
import { cn } from "@/lib/utils";
import type { BrandState } from "./actions";

const PRESETS = [
  { name: "Maximus blue", primary: "#305ee6", accent: "#b5f44a", sidebar: "#0f172a" },
  { name: "Crimson", primary: "#b91c1c", accent: "#facc15", sidebar: "#1c0a0a" },
  { name: "Emerald", primary: "#047857", accent: "#6ee7b7", sidebar: "#022c22" },
  { name: "Royal", primary: "#6d28d9", accent: "#f0abfc", sidebar: "#1e1035" },
  { name: "Ocean", primary: "#0369a1", accent: "#7dd3fc", sidebar: "#082f49" },
  { name: "Gold", primary: "#a16207", accent: "#fde68a", sidebar: "#1c1917" },
];

/** Logos keep their transparency: scale to at most 512 px and save as PNG. */
async function toPng(file: File): Promise<File> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const scale = Math.min(1, 512 / Math.max(img.naturalWidth || 512, img.naturalHeight || 512));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round((img.naturalWidth || 512) * scale));
    canvas.height = Math.max(1, Math.round((img.naturalHeight || 512) * scale));
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/png"));
    if (!blob) throw new Error("Couldn't read the logo");
    return new File([blob], "logo.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function ColourField({ label, hint, name, value, onChange, error }: { label: string; hint: string; name: string; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <Field label={label} htmlFor={name} hint={hint} error={error ? [error] : undefined}>
      <div className="flex items-center gap-2">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} aria-label={`${label} picker`}
          className="h-11 w-14 cursor-pointer rounded-xl border border-border bg-surface p-1" />
        <Input id={name} name={name} value={value} onChange={(e) => onChange(e.target.value.trim())} maxLength={7} className="font-mono" />
      </div>
    </Field>
  );
}

export function BrandEditor({ mode, officeId, initial, fallbackName, save, reset, whiteLabelUnlocked = true, children }: {
  mode: "office" | "platform";
  /** Removing "Powered by" is a paid unlock for offices. */
  whiteLabelUnlocked?: boolean;
  /** Shown under the white-label option (e.g. how to unlock it). */
  children?: React.ReactNode;
  officeId?: string;
  initial: Brand;
  fallbackName: string;
  save: (prev: BrandState, fd: FormData) => Promise<BrandState>;
  reset: () => Promise<BrandState>;
}) {
  const [state, dispatch, pending] = useActionState(save, null);
  const [resetting, startReset] = useTransition();
  const [resetMsg, setResetMsg] = useState<BrandState>(null);
  const [name, setName] = useState(initial.isDefault ? "" : initial.name);
  const [tagline, setTagline] = useState(initial.tagline ?? "");
  const [primary, setPrimary] = useState(initial.primary);
  const [accent, setAccent] = useState(initial.accent);
  const [sidebar, setSidebar] = useState(initial.sidebar);
  const [whiteLabel, setWhiteLabel] = useState(initial.whiteLabel);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(initial.logo);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [logoError, setLogoError] = useState("");

  const problems = useMemo(() => brandProblems(primary, accent, sidebar), [primary, accent, sidebar]);
  const serverErrors = state?.errors ?? {};
  const preview: Brand = { name: name || fallbackName, tagline: tagline || null, logo: removeLogo ? null : logoPreview, primary, accent, sidebar, whiteLabel, isDefault: false };

  const pickLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    setLogoError("");
    try {
      const png = await toPng(f);
      setLogoFile(png);
      setLogoPreview(URL.createObjectURL(png));
      setRemoveLogo(false);
    } catch { setLogoError("Couldn't read that image. Try a PNG or JPG."); }
  };
  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (logoFile) fd.set("logo", logoFile);
    if (removeLogo) fd.set("remove_logo", "on");
    startTransition(() => dispatch(fd));
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
      <form onSubmit={submit} className="card space-y-6 p-5 sm:p-6" noValidate>
        <FormMessage state={resetMsg ?? state} />
        {officeId && <input type="hidden" name="office_id" value={officeId} />}
        <input type="hidden" name="current_logo" value={initial.logo ?? ""} />

        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Name & logo</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={mode === "office" ? "Name members see" : "App name"} htmlFor="name" hint={`Leave blank to use "${fallbackName}"`}>
              <Input id="name" name="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder={fallbackName} />
            </Field>
            <Field label="Tagline" htmlFor="tagline" optional>
              <Input id="tagline" name="tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} maxLength={120} placeholder="e.g. Blazing a trail together" />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="grid h-16 w-32 place-items-center rounded-2xl border border-dashed border-border bg-surface-muted p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {preview.logo ? <img src={preview.logo} alt="Logo preview" className="max-h-12 max-w-full object-contain" /> : <span className="text-xs text-fg-subtle">No logo</span>}
            </span>
            <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 text-sm hover:bg-surface-muted">
              <ImagePlus className="size-4" aria-hidden />{preview.logo ? "Change logo" : "Upload logo"}
              <input type="file" accept="image/*" className="sr-only" onChange={pickLogo} />
            </label>
            {preview.logo && <button type="button" className="text-sm text-danger underline" onClick={() => { setRemoveLogo(true); setLogoFile(null); }}>Remove</button>}
            <p className="w-full text-xs text-fg-subtle">A wide logo with a transparent background looks best. It&apos;s resized automatically.</p>
            {logoError && <p className="w-full text-xs text-danger" role="alert">{logoError}</p>}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-sm font-semibold">Colours</h2>
          <div className="flex flex-wrap gap-2" aria-label="Colour presets">
            {PRESETS.map((p) => {
              const on = p.primary === primary && p.accent === accent && p.sidebar === sidebar;
              return (
                <button key={p.name} type="button" onClick={() => { setPrimary(p.primary); setAccent(p.accent); setSidebar(p.sidebar); }}
                  className={cn("flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm", on ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-muted")}>
                  <span className="flex -space-x-1" aria-hidden>
                    {[p.sidebar, p.primary, p.accent].map((c) => <span key={c} className="size-4 rounded-full ring-2 ring-surface" style={{ background: c }} />)}
                  </span>
                  {p.name}{on && <Check className="size-3.5 text-primary" aria-hidden />}
                </button>
              );
            })}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <ColourField label="Main colour" hint="Buttons and links" name="primary" value={primary} onChange={setPrimary} error={problems.primary ?? serverErrors.primary?.[0]} />
            <ColourField label="Highlight" hint="Active menu, badges" name="accent" value={accent} onChange={setAccent} error={problems.accent ?? serverErrors.accent?.[0]} />
            <ColourField label="Menu background" hint="Sidebar and headers" name="sidebar" value={sidebar} onChange={setSidebar} error={problems.sidebar ?? serverErrors.sidebar?.[0]} />
          </div>
        </section>

        {mode === "office" && (
          <div className="space-y-3 rounded-2xl bg-surface-muted/70 p-4">
            <label className={cn("flex items-start gap-3 text-sm", !whiteLabelUnlocked && "opacity-60")}>
              <Checkbox name="white_label" checked={whiteLabel} disabled={!whiteLabelUnlocked}
                onChange={(e) => setWhiteLabel(e.target.checked)} className="mt-0.5 size-4" />
              <span><b>White-label for our members</b>{!whiteLabelUnlocked && <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs text-warning">Locked</span>}
                <span className="block text-fg-muted">Your members see only your name and logo, with no &quot;Powered by&quot; line, and your name in the browser tab.</span>
              </span>
            </label>
            {children}
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-5">
          <Button type="submit" disabled={pending || Object.keys(problems).length > 0}>{pending ? "Saving…" : "Save branding"}</Button>
          <Button variant="ghost" disabled={resetting}
            onClick={() => { if (confirm("Go back to the standard look?")) startReset(async () => setResetMsg(await reset())); }}>
            <RotateCcw className="size-4" aria-hidden />Reset to standard
          </Button>
        </div>
      </form>

      <BrandPreview brand={preview} />
    </div>
  );
}

/** A small live mock of the app wearing the brand. */
function BrandPreview({ brand }: { brand: Brand }) {
  return (
    <aside aria-label="Live preview" className="xl:sticky xl:top-24 xl:self-start">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-fg-subtle">Live preview</p>
      <div className="branded overflow-hidden rounded-3xl border border-border shadow-[var(--shadow-card)]" style={brandVars(brand) as React.CSSProperties}>
        <div className="flex min-h-[340px]">
          <div className="w-40 shrink-0 bg-brand-navy p-3">
            <div className="mb-4 flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {brand.logo ? <img src={brand.logo} alt="" className="h-7 max-w-[60px] object-contain" />
                : <span className="grid size-7 place-items-center rounded-lg bg-brand-lime text-xs font-bold text-brand-navy">{brand.name.slice(0, 1).toUpperCase()}</span>}
              <span className="truncate text-sm font-bold text-white">{brand.name}</span>
            </div>
            {["Office overview", "Members", "Live attendance"].map((l, i) => (
              <div key={l} className={cn("relative mb-1 rounded-lg px-2.5 py-2 text-xs", i === 0 ? "bg-white/10 font-medium text-white" : "text-white/60")}>
                {i === 0 && <span className="absolute inset-y-1.5 left-0 w-1 rounded-r-full bg-brand-lime" aria-hidden />}{l}
              </div>
            ))}
          </div>
          <div className="flex-1 space-y-3 bg-bg p-3">
            <div className="hero-gradient rounded-2xl p-3 text-white">
              <p className="text-[10px] text-white/70">{brand.tagline ?? "Good morning,"}</p>
              <p className="text-sm font-bold">Welcome to {brand.name}</p>
              <span className="mt-2 inline-block rounded-lg bg-brand-lime px-2 py-1 text-[10px] font-semibold text-brand-navy">Check in</span>
            </div>
            <div className="card space-y-2 p-3">
              <p className="text-xs font-semibold">Today&apos;s tasks</p>
              <div className="h-1.5 rounded-full bg-surface-muted"><div className="h-full w-2/3 rounded-full bg-primary" /></div>
              <span className="inline-block rounded-full bg-primary-soft px-2 py-0.5 text-[10px] font-medium text-primary">3 of 5 done</span>
              <button type="button" className="block w-full rounded-lg bg-primary py-1.5 text-xs font-medium text-white">Add a task</button>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
