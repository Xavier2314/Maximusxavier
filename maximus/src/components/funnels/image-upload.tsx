"use client";

import { useEffect, useRef, useState } from "react";
import { Images, ImagePlus, LoaderCircle, X } from "lucide-react";
import { listMediaAction, type MediaItem } from "@/app/(app)/marketing/funnels/library-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/form";
import { createClient } from "@/lib/supabase/client";

const MAX = 8 * 1024 * 1024;

/** Uploads an image to the member's own folder in the public portfolio bucket; returns its URL. */
export async function uploadFunnelImage(userId: string, file: File): Promise<string> {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file (JPG, PNG or WebP).");
  if (file.size > MAX) throw new Error("That image is over 8 MB. Please use a smaller one.");
  const supabase = createClient();
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-50);
  const path = `${userId}/funnels/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("portfolio").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(error.message);
  return supabase.storage.from("portfolio").getPublicUrl(path).data.publicUrl;
}

/** The member's earlier uploads, shown as a small grid to pick from. */
function MediaPicker({ onPick, onClose }: { onPick: (url: string) => void; onClose: () => void }) {
  const [items, setItems] = useState<MediaItem[] | null>(null);
  useEffect(() => { let live = true; listMediaAction().then((r) => { if (live) setItems(r); }, () => { if (live) setItems([]); }); return () => { live = false; }; }, []);
  return (
    <div className="space-y-2 rounded-xl border border-border bg-surface-muted p-2.5" role="group" aria-label="Your uploaded pictures">
      <div className="flex items-center justify-between"><p className="text-xs font-semibold">Your pictures</p><Button size="sm" variant="ghost" onClick={onClose}>Close</Button></div>
      {items === null && <p className="text-xs text-fg-muted">Loading…</p>}
      {items?.length === 0 && <p className="text-xs text-fg-muted">Nothing uploaded yet. Use the upload button and your pictures will appear here.</p>}
      <ul className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto">
        {items?.map((m) => (
          <li key={m.url}>
            <button type="button" onClick={() => { onPick(m.url); onClose(); }} className="block aspect-square w-full overflow-hidden rounded-lg border border-border hover:border-primary" aria-label={`Use ${m.name}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt="" loading="lazy" className="size-full object-cover" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** An image link field with an upload button. */
export function ImageField({ userId, value, onChange, id }: { userId: string; value: string; onChange: (url: string) => void; id: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lib, setLib] = useState(false);
  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(null);
    try { onChange(await uploadFunnelImage(userId, file)); } catch (e) { setError((e as Error).message); } finally { setBusy(false); if (ref.current) ref.current.value = ""; }
  }
  return (
    <div className="space-y-2">
      {value && (
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="size-14 rounded-xl object-cover" />
          <Button size="sm" variant="ghost" onClick={() => onChange("")}><X className="size-4" aria-hidden />Remove</Button>
        </div>
      )}
      <div className="flex gap-2">
        <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Paste an image link or upload" inputMode="url" />
        <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
        <Button variant="outline" size="icon" onClick={() => ref.current?.click()} disabled={busy} aria-label="Upload image">
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
        </Button>
        <Button variant="outline" size="icon" onClick={() => setLib((v) => !v)} aria-label="Choose from your uploaded pictures" aria-expanded={lib}><Images className="size-4" aria-hidden /></Button>
      </div>
      {lib && <MediaPicker onPick={onChange} onClose={() => setLib(false)} />}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

/** Several photos at once: upload many, make one the main photo (first), reorder and remove. */
export function MultiImageField({ userId, values, onChange, max = 8, id }: { userId: string; values: string[]; onChange: (urls: string[]) => void; max?: number; id: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function pick(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError(null);
    const room = Math.max(0, max - values.length);
    const added: string[] = [];
    try {
      for (const f of Array.from(files).slice(0, room)) added.push(await uploadFunnelImage(userId, f));
      if (files.length > room) setError(`Only ${max} photos fit. The first ${room} were added.`);
    } catch (e) { setError((e as Error).message); }
    finally { if (added.length) onChange([...values, ...added]); setBusy(false); if (ref.current) ref.current.value = ""; }
  }
  const swap = (i: number, j: number) => { const a = [...values]; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div className="space-y-2">
      {values.length > 0 && (
        <ul className="grid grid-cols-4 gap-2" aria-label="Product photos">
          {values.map((u, i) => (
            <li key={u + i} className="group relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={u} alt={`Photo ${i + 1}`} className="aspect-square w-full rounded-xl object-cover" />
              {i === 0 && <span className="absolute left-1 top-1 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-fg">Main</span>}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-0.5 rounded-b-xl bg-black/55 p-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                <button type="button" aria-label="Make main photo" disabled={i === 0} onClick={() => swap(i, 0)} className="px-1 text-xs text-white disabled:opacity-40">★</button>
                <button type="button" aria-label="Move earlier" disabled={i === 0} onClick={() => swap(i, i - 1)} className="px-1 text-xs text-white disabled:opacity-40">←</button>
                <button type="button" aria-label="Move later" disabled={i === values.length - 1} onClick={() => swap(i, i + 1)} className="px-1 text-xs text-white disabled:opacity-40">→</button>
                <button type="button" aria-label="Remove photo" onClick={() => onChange(values.filter((_, k) => k !== i))} className="px-1 text-xs text-white">✕</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <input id={id} ref={ref} type="file" accept="image/*" multiple hidden onChange={(e) => pick(e.target.files)} />
      <Button variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy || values.length >= max}>
        {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <ImagePlus className="size-4" aria-hidden />}
        {values.length ? `Add more photos (${values.length}/${max})` : "Upload product photos"}
      </Button>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
