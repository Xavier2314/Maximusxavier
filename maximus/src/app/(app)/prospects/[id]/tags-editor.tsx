"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { cleanTags, MAX_TAGS } from "@/lib/contacts";
import { updateTagsAction } from "../actions";

/** Chips with an add box. Saves as you add or remove. */
export function TagsEditor({ id, initial }: { id: string; initial: string[] }) {
  const [tags, setTags] = useState<string[]>(initial);
  const [draft, setDraft] = useState("");
  const [msg, setMsg] = useState("");
  const [, start] = useTransition();
  const save = (next: string[]) => {
    setTags(next); setMsg("");
    start(async () => { const r = await updateTagsAction(id, next.join(",")); if (!r.ok) setMsg(r.message); else if (r.data) setTags(r.data); });
  };
  const add = () => { const next = cleanTags([...tags, ...cleanTags(draft)]); setDraft(""); if (next.length !== tags.length) save(next); };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium">{t}
            <button type="button" aria-label={`Remove tag ${t}`} onClick={() => save(tags.filter((x) => x !== t))} className="grid size-4 place-items-center rounded-full hover:bg-border"><X className="size-3" /></button>
          </span>
        ))}
        {tags.length === 0 && <span className="text-sm text-fg-subtle">No tags yet</span>}
      </div>
      <input value={draft} maxLength={30} disabled={tags.length >= MAX_TAGS} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }} onBlur={add}
        placeholder="Add a tag and press Enter" aria-label="Add a tag" className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm" />
      {msg && <p role="alert" className="text-xs text-danger">{msg}</p>}
    </div>
  );
}
