"use client";

import { startTransition, useActionState, useEffect, useState, useTransition } from "react";
import { Eye, EyeOff, ImagePlus, Lock, Pencil, Send, Trash2, Users } from "lucide-react";
import { shrinkImage } from "@/components/photo-picker";
import { VoiceTextarea } from "@/components/voice";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, FormMessage, Input, Select } from "@/components/ui/form";
import { Badge } from "@/components/ui/misc";
import { WHY_CATEGORIES, type Motivation } from "@/lib/planner";
import { cn, formatDate } from "@/lib/utils";
import { deleteWhyAction, encourageAction, saveWhyAction } from "./actions";

/** Add or edit one reason. Pictures are shrunk on the phone first. */
export function WhyForm({ item, onDone }: { item?: Motivation; onDone?: () => void }) {
  const [state, dispatch, pending] = useActionState(saveWhyAction, null);
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [version, setVersion] = useState(0);
  const e = state?.errors ?? {};

  useEffect(() => {
    if (state?.ok) { setImage(null); setPreview(null); setVersion((v) => v + 1); onDone?.(); }
  }, [state, onDone]);

  const pick = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const f = ev.target.files?.[0];
    ev.target.value = "";
    if (!f) return;
    const small = await shrinkImage(f, 1200, false).catch(() => null);
    if (!small) return;
    setImage(small);
    setPreview(URL.createObjectURL(small));
    setRemoveImage(false);
  };
  const submit = (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    if (image) fd.set("image", image);
    if (removeImage) fd.set("remove_image", "on");
    startTransition(() => dispatch(fd));
  };

  return (
    <form key={version} onSubmit={submit} className="space-y-4" noValidate>
      <FormMessage state={state} />
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="grid gap-4 sm:grid-cols-[200px_1fr]">
        <Field label="What kind?" htmlFor={`cat-${item?.id ?? "new"}`}>
          <Select id={`cat-${item?.id ?? "new"}`} name="category" defaultValue={item?.category ?? "reason"}>
            {WHY_CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.emoji} {c.label}</option>)}
          </Select>
        </Field>
        <Field label="In one line" htmlFor={`title-${item?.id ?? "new"}`} error={e.title}>
          <Input id={`title-${item?.id ?? "new"}`} name="title" maxLength={120} defaultValue={item?.title}
            placeholder="e.g. Build my mother a house by 2028" required />
        </Field>
      </div>
      <Field label="Tell the story" htmlFor={`body-${item?.id ?? "new"}`} optional hint="Type or tap Speak. Why does this matter so much to you?">
        <VoiceTextarea id={`body-${item?.id ?? "new"}`} name="body" rows={4} maxLength={2000} defaultValue={item?.body ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="By when? (optional)" htmlFor={`date-${item?.id ?? "new"}`}>
          <Input id={`date-${item?.id ?? "new"}`} type="date" name="target_date" defaultValue={item?.target_date ?? ""} />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium">Picture (optional)</p>
          <div className="flex items-center gap-3">
            {(preview || (item?.image_path && !removeImage)) && (
              <span className="text-xs text-fg-muted">{preview ? "New picture ready" : "Has a picture"}</span>
            )}
            <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-border px-3 text-sm hover:bg-surface-muted">
              <ImagePlus className="size-4" aria-hidden />{preview || item?.image_path ? "Change" : "Add picture"}
              <input type="file" accept="image/*" className="sr-only" onChange={pick} />
            </label>
            {item?.image_path && !preview && (
              <button type="button" className="text-xs text-danger underline" onClick={() => setRemoveImage((r) => !r)}>
                {removeImage ? "Keep picture" : "Remove"}
              </button>
            )}
          </div>
          {preview && <img src={preview} alt="" className="mt-2 h-24 rounded-xl object-cover" />}
        </div>
      </div>
      <fieldset className="space-y-2 rounded-2xl bg-surface-muted/70 p-4">
        <legend className="sr-only">Privacy</legend>
        <label className="flex items-start gap-2.5 text-sm">
          <Checkbox name="shared" defaultChecked={item?.shared ?? false} className="mt-0.5 size-4" />
          <span><b>Share with my sponsor and team leader</b><span className="block text-xs text-fg-muted">They can see it and send you encouragement. Leave unticked to keep it private.</span></span>
        </label>
        <label className="flex items-start gap-2.5 text-sm">
          <Checkbox name="show_on_dashboard" defaultChecked={item?.show_on_dashboard ?? true} className="mt-0.5 size-4" />
          <span><b>Show on my home page</b><span className="block text-xs text-fg-muted">A daily reminder of why you&apos;re doing this.</span></span>
        </label>
      </fieldset>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : item ? "Save" : "Add to My Why"}</Button>
        {onDone && item && <Button variant="ghost" onClick={onDone}>Cancel</Button>}
      </div>
    </form>
  );
}

export function WhyCard({ item, imageUrl, editable }: { item: Motivation; imageUrl?: string | null; editable: boolean }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const cat = WHY_CATEGORIES.find((c) => c.key === item.category);
  if (editing) return <div className="card p-5"><WhyForm item={item} onDone={() => setEditing(false)} /></div>;
  return (
    <article className={cn("card overflow-hidden", pending && "opacity-60")}>
      {imageUrl && <img src={imageUrl} alt="" className="h-44 w-full object-cover" />}
      <div className="p-5">
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          <Badge tone="lime">{cat?.emoji} {cat?.label}</Badge>
          {item.shared ? <Badge tone="blue"><Users className="size-3" aria-hidden />Shared with leaders</Badge> : <Badge><Lock className="size-3" aria-hidden />Private</Badge>}
          {item.show_on_dashboard ? <Badge><Eye className="size-3" aria-hidden />On home</Badge> : <Badge><EyeOff className="size-3" aria-hidden />Hidden from home</Badge>}
        </div>
        <h3 className="text-lg font-semibold leading-snug">{item.title}</h3>
        {item.target_date && <p className="mt-0.5 text-sm text-primary">By {formatDate(item.target_date, { month: "long", year: "numeric" })}</p>}
        {item.body && <p className="mt-2 whitespace-pre-line text-sm text-fg-muted">{item.body}</p>}
        {editable && (
          <div className="mt-4 flex gap-1">
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)}><Pencil className="size-4" aria-hidden />Edit</Button>
            <Button variant="ghost" size="sm" className="hover:text-danger"
              onClick={() => { if (confirm("Remove this from My Why?")) start(async () => { await deleteWhyAction(item.id); }); }}>
              <Trash2 className="size-4" aria-hidden />Remove
            </Button>
          </div>
        )}
      </div>
    </article>
  );
}

/** Leaders: send a short, kind message about something the member shared. */
export function Encourage({ motivationId, firstName }: { motivationId: string; firstName: string }) {
  const [text, setText] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; message: string } | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} maxLength={500} placeholder={`Encourage ${firstName}…`} aria-label="Encouragement" className="h-9 text-sm" />
        <Button size="sm" disabled={pending || text.trim().length < 2}
          onClick={() => start(async () => { const r = await encourageAction(motivationId, text); setMsg(r); if (r.ok) setText(""); })}>
          <Send className="size-4" aria-hidden />Send
        </Button>
      </div>
      {msg && <p className={cn("text-xs", msg.ok ? "text-success" : "text-danger")} role="status">{msg.message}</p>}
    </div>
  );
}
