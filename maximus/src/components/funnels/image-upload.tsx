"use client";

import { useRef, useState } from "react";
import { ImagePlus, LoaderCircle, X } from "lucide-react";
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

/** An image link field with an upload button. */
export function ImageField({ userId, value, onChange, id }: { userId: string; value: string; onChange: (url: string) => void; id: string }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}
