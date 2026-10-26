"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { Bot, Music2, PenLine, Reply, Send, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FormMessage, Input, Textarea } from "@/components/ui/form";
import { SubmitButton } from "@/components/ui/submit-button";
import type { SpotifyItem } from "@/lib/followup";
import { whatsappLink, type Prospect, type ProspectChannel, type ProspectMessage } from "@/lib/prospects";
import { cn, formatRelative } from "@/lib/utils";
import {
  deleteProspectAction, logReplyAction, sendMessageAction, setAutopilotAction, spotifySearchAction, suggestMessagesAction,
  updateProspectAction,
} from "../actions";
import { ProspectFields } from "../prospect-fields";

type Notice = { ok: boolean; message: string } | null;

function Bubble({ m, name }: { m: ProspectMessage; name: string }) {
  const out = m.direction === "out";
  return (
    <li className={cn("flex", out ? "justify-end" : "justify-start")}>
      <div className={cn("max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm",
        out ? "rounded-br-md bg-primary text-primary-fg" : "rounded-bl-md bg-surface-muted",
        m.status === "failed" && "bg-danger-soft text-danger")}>
        <p className="whitespace-pre-wrap break-words">{m.body}</p>
        <p className={cn("mt-1 flex flex-wrap items-center gap-1.5 text-xs", out && m.status !== "failed" ? "text-primary-fg/80" : "text-fg-subtle")}>
          {!out && <span>{name} ·</span>}
          {m.ai_generated && <span className="inline-flex items-center gap-0.5"><Bot className="size-3" aria-hidden />AI ·</span>}
          <span>{m.status === "sent" ? "Sent by Maximus" : m.status === "logged" ? "You sent" : m.status === "failed" ? `Not sent: ${m.error ?? "error"}` : ""}</span>
          <span>{formatRelative(m.created_at)}</span>
        </p>
      </div>
    </li>
  );
}

export function Conversation({ prospect: p, messages, readOnly, canAutoSend, spotifySearch }: {
  prospect: Prospect; messages: ProspectMessage[]; readOnly: boolean; canAutoSend: boolean; spotifySearch: boolean;
}) {
  const [body, setBody] = useState("");
  const [fromAi, setFromAi] = useState(false);
  const [situation, setSituation] = useState("");
  const [options, setOptions] = useState<string[]>([]);
  const [attachment, setAttachment] = useState<SpotifyItem | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [reply, setReply] = useState("");
  const [showReply, setShowReply] = useState(false);
  const [pending, start] = useTransition();
  const first = p.full_name.split(" ")[0];

  const suggest = () => start(async () => {
    setNotice(null);
    const r = await suggestMessagesAction({ id: p.id, situation: situation || undefined, attachment: attachment?.url ?? null });
    if (r.ok && r.data) setOptions(r.data); else setNotice(r);
  });
  const fullText = attachment && !body.includes(attachment.url) ? `${body}\n\n${attachment.url}` : body;
  const send = (mode: "auto" | "logged") => start(async () => {
    const r = await sendMessageAction({ id: p.id, body, attachment: attachment?.url ?? null, mode, ai: fromAi });
    setNotice(r);
    if (r.ok) { setBody(""); setOptions([]); setAttachment(null); setFromAi(false); }
  });
  const openWhatsApp = () => {
    if (!p.phone || !body.trim()) return;
    window.open(whatsappLink(p.phone, fullText), "_blank", "noopener");
    send("logged");
  };
  const openEmail = () => {
    if (!p.email || !body.trim()) return;
    window.location.href = `mailto:${p.email}?body=${encodeURIComponent(fullText)}`;
    send("logged");
  };
  const saveReply = () => start(async () => {
    const r = await logReplyAction({ id: p.id, body: reply });
    setNotice(r);
    if (r.ok) {
      setReply(""); setShowReply(false);
      const s = await suggestMessagesAction({ id: p.id });
      if (s.ok && s.data) setOptions(s.data);
    }
  });

  return (
    <Card>
      <CardHeader title="Conversation" description={readOnly ? "Read only" : `Everything you and ${first} have said`} />
      <CardBody className="space-y-4">
        {messages.length === 0
          ? <p className="py-6 text-center text-sm text-fg-muted">No messages yet. Write the first one below, or let Maximus AI help.</p>
          : <ul className="max-h-[55vh] space-y-2 overflow-y-auto pr-1">{messages.filter((m) => m.status !== "draft").map((m) => <Bubble key={m.id} m={m} name={first} />)}</ul>}

        {!readOnly && (
          <div className="space-y-3 border-t border-border pt-4">
            <FormMessage state={notice} />
            {p.opted_out && <p className="rounded-xl bg-warning-soft px-3 py-2 text-sm text-warning">{first} asked not to be contacted. Respect their decision.</p>}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={situation} onChange={(e) => setSituation(e.target.value)} aria-label="Describe the situation (optional)"
                placeholder={`Optional: describe the situation, e.g. "${first} says she has no time"`} />
              <Button variant="secondary" onClick={suggest} disabled={pending}><PenLine className="size-4" aria-hidden />Help me write</Button>
            </div>
            {options.length > 0 && (
              <ul className="grid gap-2">
                {options.map((o, i) => (
                  <li key={i}>
                    <button type="button" onClick={() => { setBody(o); setFromAi(true); }}
                      className="w-full rounded-xl border border-primary/30 bg-primary-soft/50 p-3 text-left text-sm hover:border-primary">
                      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-primary">Option {i + 1} · tap to use</span>{o}
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <Textarea value={body} onChange={(e) => { setBody(e.target.value); }} rows={4} aria-label="Message"
              placeholder={`Write to ${first}…`} />
            <SpotifyPicker value={attachment} onChange={setAttachment} searchEnabled={spotifySearch} />

            <div className="flex flex-wrap gap-2">
              {canAutoSend && (
                <Button onClick={() => send("auto")} disabled={pending || !body.trim() || p.opted_out}>
                  <Send className="size-4" aria-hidden />Send now{p.channel === "email" ? " (Gmail)" : " (WhatsApp)"}
                </Button>
              )}
              {p.phone && (
                <Button variant={canAutoSend ? "outline" : "success"} onClick={openWhatsApp} disabled={pending || !body.trim()}>
                  Open in my WhatsApp
                </Button>
              )}
              {p.email && !canAutoSend && <Button variant="outline" onClick={openEmail} disabled={pending || !body.trim()}>Open in my email</Button>}
              {!p.phone && !p.email && <Button variant="outline" onClick={() => send("logged")} disabled={pending || !body.trim()}>Save as sent</Button>}
              <Button variant="ghost" onClick={() => setShowReply((s) => !s)}><Reply className="size-4" aria-hidden />{first} replied</Button>
            </div>
            {showReply && (
              <div className="space-y-2 rounded-xl bg-surface-muted p-3">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={3} aria-label={`What ${first} said`}
                  placeholder={`Paste what ${first} said. Maximus AI will suggest your answer.`} />
                <Button size="sm" onClick={saveReply} disabled={pending || !reply.trim()}>Add reply</Button>
              </div>
            )}
          </div>
        )}
      </CardBody>
    </Card>
  );
}

function SpotifyPicker({ value, onChange, searchEnabled }: { value: SpotifyItem | null; onChange: (v: SpotifyItem | null) => void; searchEnabled: boolean }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<SpotifyItem[]>([]);
  const [msg, setMsg] = useState("");
  const [pending, start] = useTransition();
  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-[#1db954]/40 bg-[#1db954]/10 p-2">
        {value.image ? <Image src={value.image} alt="" width={40} height={40} className="rounded-lg" unoptimized /> : <Music2 className="size-5 text-[#1db954]" />}
        <div className="min-w-0 flex-1 text-sm"><p className="truncate font-medium">{value.title}</p><p className="truncate text-xs text-fg-muted">{value.subtitle}</p></div>
        <button type="button" onClick={() => onChange(null)} aria-label="Remove Spotify link" className="grid size-11 place-items-center rounded-lg hover:bg-surface"><X className="size-4" /></button>
      </div>
    );
  }
  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 text-sm font-medium text-[#1a9c48] hover:underline"><Music2 className="size-4" aria-hidden />Add a Spotify podcast or song</button>;
  }
  const search = () => start(async () => {
    const r = await spotifySearchAction(q);
    setItems(r.data ?? []); setMsg(r.ok ? "" : r.message);
  });
  return (
    <div className="space-y-2 rounded-xl bg-surface-muted p-3">
      <div className="flex gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); search(); } }}
          placeholder={searchEnabled ? "Search Spotify or paste a link" : "Paste a Spotify link"} aria-label="Spotify search" />
        <Button variant="secondary" onClick={search} disabled={pending || q.trim().length < 2}>{searchEnabled ? "Search" : "Add"}</Button>
      </div>
      {msg && <p className="text-xs text-fg-muted">{msg}</p>}
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.url}>
            <button type="button" onClick={() => { onChange(it); setOpen(false); setItems([]); setQ(""); }}
              className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left hover:bg-surface">
              {it.image ? <Image src={it.image} alt="" width={36} height={36} className="rounded-md" unoptimized /> : <Music2 className="size-5" />}
              <span className="min-w-0 text-sm"><span className="block truncate font-medium">{it.title}</span><span className="block truncate text-xs text-fg-muted">{it.subtitle}</span></span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Autopilot({ id, on, optedOut, channel, ready, gmailNeeded }: {
  id: string; on: boolean; optedOut: boolean; channel: ProspectChannel; ready: boolean; gmailNeeded: boolean;
}) {
  const [notice, setNotice] = useState<Notice>(null);
  const [pending, start] = useTransition();
  const toggle = () => start(async () => setNotice(await setAutopilotAction({ id, on: !on })));
  return (
    <div className="space-y-3">
      <FormMessage state={notice} />
      <div className="flex items-center gap-3">
        <span className={cn("grid size-10 place-items-center rounded-xl", on ? "bg-brand-navy text-brand-lime" : "bg-surface-muted text-fg-subtle")}><Bot className="size-5" aria-hidden /></span>
        <p className="flex-1 text-sm">{on ? "Maximus AI is following up and answering replies." : "Off: you write and send the messages."}</p>
      </div>
      <Button className="w-full" variant={on ? "outline" : "primary"} onClick={toggle} disabled={pending || (optedOut && !on)}>
        {on ? "Turn off AI follow-up" : "Let Maximus AI follow up"}
      </Button>
      {!on && channel === "manual" && <p className="text-xs text-fg-subtle">Set “Follow up by” to WhatsApp or Email below first.</p>}
      {!on && gmailNeeded && <p className="text-xs text-fg-subtle">Connect your Gmail in <a href="/settings#connections" className="text-primary underline">Settings</a> first.</p>}
      {!on && channel === "whatsapp" && !ready && <p className="text-xs text-fg-subtle">Needs the organisation&apos;s WhatsApp Business number to be connected (admin setup) and the prospect&apos;s number.</p>}
      <p className="text-xs text-fg-subtle">It stops by itself if they say no or ask to stop, and pauses after 3 follow-ups with no answer. You get a notification whenever they reply.</p>
    </div>
  );
}

export function EditProspect({ prospect }: { prospect: Prospect }) {
  const [state, action] = useActionState(updateProspectAction, null);
  const [pending, start] = useTransition();
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="id" value={prospect.id} />
      <FormMessage state={state} />
      <ProspectFields p={prospect} errors={state?.errors} />
      <div className="flex gap-2">
        <SubmitButton className="flex-1" pendingLabel="Saving…">Save</SubmitButton>
        <Button variant="ghost" aria-label="Delete prospect" disabled={pending}
          onClick={() => { if (confirm(`Delete ${prospect.full_name} and the whole conversation?`)) start(async () => { await deleteProspectAction(prospect.id); }); }}>
          <Trash2 className="size-4 text-danger" />
        </Button>
      </div>
    </form>
  );
}
