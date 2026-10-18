"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Check, Copy, ExternalLink, Share2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import { createWatchRoomAction, deleteWatchRoomAction } from "./actions";

export function WatchRoomForm() {
  const [state, action] = useActionState(createWatchRoomAction, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="space-y-4">
      <FormMessage state={state} />
      <Field label="YouTube link" htmlFor="url">
        <Input id="url" name="url" required inputMode="url" placeholder="https://youtu.be/…" autoComplete="off" />
      </Field>
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required maxLength={120} placeholder="e.g. Why I joined Maximus" />
      </Field>
      <Field label="Message for viewers (optional)" htmlFor="description">
        <Textarea id="description" name="description" maxLength={1000} rows={3} placeholder="Watch till the end, then message me!" />
      </Field>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox name="live_sync" defaultChecked className="mt-0.5" />
        <span><b>Watch together</b> — when you open the link, everyone watching follows your play, pause and skip.</span>
      </label>
      <SubmitButton className="w-full" pendingLabel="Creating…">Create share link</SubmitButton>
    </form>
  );
}

export function RoomActions({ id, slug, title }: { id: string; slug: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [pending, start] = useTransition();
  const link = () => `${window.location.origin}/w/${slug}`;
  async function copy() {
    try { await navigator.clipboard.writeText(link()); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* blocked */ }
  }
  async function share() {
    if (navigator.share) await navigator.share({ title, text: `Watch "${title}" with me`, url: link() }).catch(() => {});
    else window.open(`https://wa.me/?text=${encodeURIComponent(`Watch "${title}" with me: ${link()}`)}`, "_blank", "noopener");
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Button size="sm" onClick={share}><Share2 className="size-4" aria-hidden />Share</Button>
      <Button size="sm" variant="outline" onClick={copy}>{copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4" aria-hidden />}{copied ? "Copied" : "Copy link"}</Button>
      <Link href={`/w/${slug}`} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium hover:bg-surface-muted">
        <ExternalLink className="size-4" aria-hidden />Open as host
      </Link>
      <Button size="sm" variant="ghost" aria-label={`Delete ${title}`} disabled={pending}
        onClick={() => { if (confirm("Delete this watch link? People with the link won't be able to open it.")) start(() => deleteWatchRoomAction(id)); }}>
        <Trash2 className="size-4" aria-hidden />
      </Button>
    </div>
  );
}
