"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, FileText, Film, ImagePlus, Link2, LoaderCircle, Trash2, Type, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/form";
import { parseVideoLink } from "@/lib/featured";
import type { PortfolioBlock } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/client";

const MAX = 50 * 1024 * 1024;
const newId = () => Math.random().toString(36).slice(2, 12);

/** Uploads one file to the member's own folder in the portfolio bucket; returns its public URL. */
export async function uploadPortfolioFile(userId: string, siteId: string, file: File): Promise<string> {
  if (file.size > MAX) throw new Error("That file is over 50 MB. Please use a smaller one.");
  const supabase = createClient();
  const safe = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-").slice(-60);
  const path = `${userId}/${siteId}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("portfolio").upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(/mime|type/i.test(error.message) ? "That file type isn't allowed. Use images, MP4 videos, PDF or Office files." : error.message);
  return supabase.storage.from("portfolio").getPublicUrl(path).data.publicUrl;
}

/** Images, videos, files, text and video links shown in the Portfolio section of the site. */
export function MediaEditor({ userId, siteId, blocks, onChange }: {
  userId: string; siteId: string; blocks: PortfolioBlock[]; onChange: (b: PortfolioBlock[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState("");

  const update = (id: string, patch: Partial<PortfolioBlock>) => onChange(blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= blocks.length) return;
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setBusy(true); setError(null);
    const added: PortfolioBlock[] = [];
    try {
      for (const f of Array.from(files).slice(0, 10)) {
        const url = await uploadPortfolioFile(userId, siteId, f);
        const type = f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : "file";
        added.push({ id: newId(), type, url, name: f.name, title: f.name.replace(/\.[^.]+$/, "") });
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      if (added.length) onChange([...blocks, ...added].slice(0, 40));
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function addLink() {
    const v = parseVideoLink(link);
    if (!v) { setError("Paste a YouTube or Loom video link."); return; }
    onChange([...blocks, { id: newId(), type: "embed", provider: v.provider, video_id: v.video_id, title: "" }].slice(0, 40));
    setLink(""); setError(null);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input ref={fileRef} type="file" multiple hidden onChange={(e) => onFiles(e.target.files)}
          accept="image/*,video/mp4,video/webm,video/quicktime,application/pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.txt" />
        <Button variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
          {busy ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
          {busy ? "Uploading…" : "Upload images, videos or files"}
        </Button>
        <Button variant="outline" onClick={() => onChange([...blocks, { id: newId(), type: "text", title: "", text: "" }].slice(0, 40))}>
          <Type className="size-4" aria-hidden />Add text
        </Button>
      </div>
      <div className="flex gap-2">
        <Input value={link} onChange={(e) => setLink(e.target.value)} placeholder="YouTube or Loom video link" inputMode="url" />
        <Button variant="outline" onClick={addLink}><Link2 className="size-4" aria-hidden />Add video link</Button>
      </div>
      <p className="text-xs text-fg-subtle">Up to 50 MB per file. Images, MP4 videos, PDF, Word, PowerPoint, Excel and ZIP.</p>
      {error && <p className="text-sm text-danger" role="alert">{error}</p>}

      {blocks.length === 0 && <p className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-fg-muted">Nothing added yet. Show your best work here.</p>}
      <ul className="space-y-2">
        {blocks.map((b, i) => (
          <li key={b.id} className="rounded-2xl border border-border p-3">
            <div className="flex items-start gap-3">
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface-muted text-fg-muted">
                {b.type === "image" && b.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={b.url} alt="" className="size-full object-cover" />
                ) : b.type === "video" || b.type === "embed" ? <Film className="size-6" aria-hidden />
                  : b.type === "text" ? <Type className="size-6" aria-hidden /> : b.type === "file" ? <FileText className="size-6" aria-hidden /> : <ImagePlus className="size-6" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1 space-y-2">
                <Input value={b.title ?? ""} onChange={(e) => update(b.id, { title: e.target.value })} placeholder="Title (optional)" maxLength={120} />
                {b.type === "text"
                  ? <Textarea value={b.text ?? ""} onChange={(e) => update(b.id, { text: e.target.value })} rows={3} maxLength={3000} placeholder="Write anything: a story, results, testimonials…" />
                  : <Input value={b.text ?? ""} onChange={(e) => update(b.id, { text: e.target.value })} maxLength={500} placeholder="Caption (optional)" />}
                <p className="truncate text-xs text-fg-subtle">
                  {b.type === "embed" ? `${b.provider === "loom" ? "Loom" : "YouTube"} video` : b.type === "text" ? "Text" : `${b.type[0].toUpperCase()}${b.type.slice(1)} · ${b.name ?? ""}`}
                </p>
              </div>
              <div className="flex flex-col gap-1">
                <Button size="icon" variant="ghost" aria-label="Move up" onClick={() => move(i, -1)}><ArrowUp className="size-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Move down" onClick={() => move(i, 1)}><ArrowDown className="size-4" /></Button>
                <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => onChange(blocks.filter((x) => x.id !== b.id))}><Trash2 className="size-4" /></Button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
