"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Ban, Check, CheckCheck, CornerUpLeft, FileText, Flag, Mic, MoreVertical, Paperclip, Pencil, Search, Send, Square, Target, Timer, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, Progress } from "@/components/ui/misc";
import { createClient } from "@/lib/supabase/client";
import { cn, formatDate } from "@/lib/utils";

export type ChatMessage = {
  id: string; conversation_id: string; sender_id: string; kind: "text" | "image" | "file" | "voice" | "goal" | "focus_invite" | "quick";
  body: string | null; attachment_path: string | null; attachment_name: string | null; attachment_size: number | null; duration_ms: number | null;
  goal_id: string | null; focus_minutes: number | null; reply_to: string | null; edited_at: string | null; deleted_at: string | null; created_at: string;
};
type Goal = { id: string; title: string; progress: number; target: number | null; unit: string | null };

const QUICK = ["👋 Checking in! How's your day going?", "🎯 How's your goal going?", "🎉 Proud of you!", "💪 You've got this. Keep going!"];
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf", "text/plain", "video/mp4",
  "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

const time = (iso: string) => new Date(iso).toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });

export function ChatRoom({ conversationId, viewerId, other, canSend, otherLastRead: initialRead, initial, goals: initialGoals, myGoals }: {
  conversationId: string; viewerId: string; other: { id: string; name: string; avatar: string | null }; canSend: boolean;
  otherLastRead: string | null; initial: ChatMessage[]; goals: Goal[]; myGoals: Goal[];
}) {
  const supabase = useMemo(() => createClient(), []);
  const [messages, setMessages] = useState(initial);
  const [hasOlder, setHasOlder] = useState(initial.length >= 60);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ChatMessage | null>(null);
  const [otherRead, setOtherRead] = useState(initialRead);
  const [online, setOnline] = useState(false);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [picker, setPicker] = useState<"goal" | "focus" | null>(null);
  const [recording, setRecording] = useState<{ rec: MediaRecorder; started: number } | null>(null);
  const [goals, setGoals] = useState(() => new Map<string, Goal>([...initialGoals, ...myGoals].map((g) => [g.id, g] as const)));
  const [urls, setUrls] = useState<Record<string, string>>({});
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const first = other.name.split(" ")[0];

  const markRead = useCallback(() => {
    if (document.visibilityState !== "visible") return;
    void supabase.from("conversation_members").update({ last_read_at: new Date().toISOString() })
      .eq("conversation_id", conversationId).eq("user_id", viewerId);
  }, [supabase, conversationId, viewerId]);

  // Realtime: new and edited messages, read receipts, typing and online status.
  useEffect(() => {
    markRead();
    const ch = supabase.channel(`chat:${conversationId}`, { config: { private: true, presence: { key: viewerId } } })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (p) => {
        const m = p.new as ChatMessage;
        setMessages((all) => (all.some((x) => x.id === m.id) ? all : [...all, m]));
        if (m.sender_id !== viewerId) { setTyping(false); markRead(); }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, (p) => {
        const m = p.new as ChatMessage;
        setMessages((all) => all.map((x) => (x.id === m.id ? m : x)));
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "conversation_members", filter: `conversation_id=eq.${conversationId}` }, (p) => {
        const r = p.new as { user_id: string; last_read_at: string | null };
        if (r.user_id === other.id) setOtherRead(r.last_read_at);
      })
      .on("broadcast", { event: "typing" }, (p) => {
        if ((p.payload as { user?: string })?.user !== other.id) return;
        setTyping(true);
        if (typingTimer.current) clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(false), 4000);
      })
      .on("presence", { event: "sync" }, () => setOnline(Object.keys(ch.presenceState()).includes(other.id)))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") await ch.track({ at: Date.now() });
      });
    channelRef.current = ch;
    const onVis = () => markRead();
    document.addEventListener("visibilitychange", onVis);
    return () => { document.removeEventListener("visibilitychange", onVis); void supabase.removeChannel(ch); };
  }, [supabase, conversationId, viewerId, other.id, markRead]);

  useEffect(() => {
    void supabase.from("user_blocks").select("blocked_id").eq("blocked_id", other.id).maybeSingle().then(({ data }) => setBlocked(Boolean(data)));
  }, [supabase, other.id]);

  useEffect(() => { if (!search) bottomRef.current?.scrollIntoView({ block: "end" }); }, [messages.length, search]);

  // Signed links for attachments (the bucket is private).
  useEffect(() => {
    const need = messages.filter((m) => m.attachment_path && !urls[m.attachment_path]).map((m) => m.attachment_path!);
    if (!need.length) return;
    void supabase.storage.from("chat").createSignedUrls(need, 3600).then(({ data }) => {
      if (!data) return;
      setUrls((u) => ({ ...u, ...Object.fromEntries(data.filter((d) => d.signedUrl && d.path).map((d) => [d.path!, d.signedUrl])) }));
    });
  }, [messages, urls, supabase]);

  // Goal cards from the other person (visible only if they share goals).
  useEffect(() => {
    const need = [...new Set(messages.map((m) => m.goal_id).filter((g): g is string => Boolean(g) && !goals.has(g!)))];
    if (!need.length) return;
    void supabase.from("tool_goals").select("id, title, progress, target, unit").in("id", need).then(({ data }) => {
      if (data?.length) setGoals((m) => new Map<string, Goal>([...m, ...(data as Goal[]).map((g) => [g.id, g] as const)]));
    });
  }, [messages, goals, supabase]);

  function onType(v: string) {
    setText(v);
    const now = Date.now();
    if (now - lastTypingSent.current > 2500 && channelRef.current) {
      lastTypingSent.current = now;
      void channelRef.current.send({ type: "broadcast", event: "typing", payload: { user: viewerId } });
    }
  }

  async function insert(row: Partial<ChatMessage>) {
    setBusy(true);
    setError(null);
    const { data, error: err } = await supabase.from("messages")
      .insert({ conversation_id: conversationId, reply_to: replyTo?.id ?? null, ...row }).select("*").single();
    setBusy(false);
    if (err) { setError(blocked ? "You've blocked this person. Unblock to send messages." : "Couldn't send. Check your connection and try again."); return false; }
    setMessages((all) => (all.some((x) => x.id === data.id) ? all : [...all, data as ChatMessage]));
    setReplyTo(null);
    return true;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    if (editing) {
      const { error: err } = await supabase.from("messages").update({ body }).eq("id", editing.id);
      if (err) setError("Couldn't edit that message.");
      else setMessages((all) => all.map((m) => (m.id === editing.id ? { ...m, body, edited_at: new Date().toISOString() } : m)));
      setEditing(null); setText("");
      return;
    }
    if (await insert({ kind: "text", body })) setText("");
  }

  async function upload(file: Blob, name: string, type: string) {
    const path = `${conversationId}/${viewerId}/${crypto.randomUUID()}-${name.replace(/[^\w.-]+/g, "_").slice(-80)}`;
    const { error: err } = await supabase.storage.from("chat").upload(path, file, { contentType: type, upsert: false });
    if (err) { setError("Upload failed. Files can be up to 20 MB."); return null; }
    return path;
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 20 * 1024 * 1024) { setError("That file is over 20 MB."); return; }
    if (!ALLOWED.includes(f.type)) { setError("That file type isn't supported. Try a photo, PDF or document."); return; }
    setBusy(true);
    const path = await upload(f, f.name, f.type);
    setBusy(false);
    if (path) await insert({ kind: f.type.startsWith("image/") ? "image" : "file", attachment_path: path, attachment_name: f.name.slice(0, 200), attachment_size: f.size, body: text.trim() || null });
    setText("");
  }

  async function startVoice() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm", "audio/mp4", "audio/ogg"].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks: BlobPart[] = [];
      rec.ondataavailable = (ev) => { if (ev.data.size) chunks.push(ev.data); };
      const started = Date.now();
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const type = (rec.mimeType || mime || "audio/webm").split(";")[0];
        const blob = new Blob(chunks, { type });
        const ms = Math.min(600000, Date.now() - started);
        if (ms < 700 || !blob.size) return;
        setBusy(true);
        const path = await upload(blob, `voice.${type.includes("mp4") ? "m4a" : type.split("/")[1]}`, type);
        setBusy(false);
        if (path) await insert({ kind: "voice", attachment_path: path, attachment_name: "Voice note", attachment_size: blob.size, duration_ms: ms });
      };
      rec.start();
      setRecording({ rec, started });
    } catch {
      setError("Microphone not available. Allow microphone access in your browser settings.");
    }
  }
  function stopVoice(cancel = false) {
    if (!recording) return;
    if (cancel) recording.rec.ondataavailable = null;
    recording.rec.stop();
    setRecording(null);
  }

  async function remove(m: ChatMessage) {
    if (!confirm("Delete this message for both of you?")) return;
    const { error: err } = await supabase.from("messages").update({ deleted_at: new Date().toISOString() }).eq("id", m.id);
    if (err) setError("Couldn't delete that message.");
    else setMessages((all) => all.map((x) => (x.id === m.id ? { ...x, deleted_at: new Date().toISOString(), body: null, attachment_path: null } : x)));
  }

  async function report(m: ChatMessage | null) {
    const reason = prompt(m ? "Why are you reporting this message? A copy of this one message will be shared with the Maximus safety team." : "What's wrong? Describe the problem. Your chat itself is not shared.");
    if (!reason || reason.trim().length < 3) return;
    const { error: err } = await supabase.from("message_reports").insert({
      reported_id: other.id, message_id: m?.id ?? null, snapshot: m?.body ?? (m?.attachment_name ? `[${m.kind}] ${m.attachment_name}` : null), reason: reason.trim().slice(0, 1000),
    });
    setError(err ? "Couldn't send the report." : "Report sent. Thank you.");
  }

  async function toggleBlock() {
    setMenu(false);
    if (blocked) {
      await supabase.from("user_blocks").delete().eq("blocked_id", other.id);
      setBlocked(false);
    } else if (confirm(`Block ${first}? Neither of you will be able to send messages until you unblock.`)) {
      const { error: err } = await supabase.from("user_blocks").insert({ blocked_id: other.id });
      if (!err) setBlocked(true);
    }
  }

  async function loadOlder() {
    const oldest = messages[0];
    if (!oldest) return;
    const { data } = await supabase.from("messages").select("*").eq("conversation_id", conversationId)
      .lt("created_at", oldest.created_at).order("created_at", { ascending: false }).limit(60);
    const older = ((data ?? []) as ChatMessage[]).reverse();
    setHasOlder(older.length >= 60);
    setMessages((all) => [...older, ...all]);
  }

  const shown = search ? messages.filter((m) => (m.body ?? m.attachment_name ?? "").toLowerCase().includes(search.toLowerCase())) : messages;
  const byId = new Map(messages.map((m) => [m.id, m]));
  const sendable = canSend && !blocked;

  return (
    <div className="card flex h-[calc(100dvh-11rem)] min-h-[420px] flex-col overflow-hidden lg:h-[calc(100dvh-8rem)]">
      <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="relative">
            <Avatar name={other.name} src={other.avatar} size={40} />
            <span className={cn("absolute bottom-0 right-0 size-3 rounded-full ring-2 ring-surface", online ? "bg-brand-green" : "bg-fg-subtle")} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{other.name}</p>
            <p className="text-xs text-fg-muted" aria-live="polite">{typing ? "typing…" : online ? "Online" : "Offline"}</p>
          </div>
        </div>
        <div className="relative flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Search messages" onClick={() => setSearch((s) => (s === null ? "" : null))}><Search className="size-5" aria-hidden /></Button>
          <Button variant="ghost" size="icon" aria-label="More" onClick={() => setMenu((v) => !v)}><MoreVertical className="size-5" aria-hidden /></Button>
          {menu && (
            <div className="absolute right-0 top-11 z-20 w-48 rounded-xl border border-border bg-bg-elevated p-1 text-sm shadow-lg">
              <Link href="/tools/accountability" className="block rounded-lg px-3 py-2 hover:bg-surface-muted">Partner page</Link>
              <button type="button" onClick={toggleBlock} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left hover:bg-surface-muted"><Ban className="size-4" aria-hidden />{blocked ? "Unblock" : "Block"}</button>
              <button type="button" onClick={() => { setMenu(false); void report(null); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-danger hover:bg-surface-muted"><Flag className="size-4" aria-hidden />Report a problem</button>
            </div>
          )}
        </div>
      </header>
      {search !== null && (
        <div className="flex items-center gap-2 border-b border-border px-4 py-2">
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search this chat" aria-label="Search this chat"
            className="h-9 flex-1 rounded-lg bg-surface-muted px-3 text-sm outline-none" />
          <span className="text-xs text-fg-muted">{search ? `${shown.length} found` : ""}</span>
        </div>
      )}

      <div className="flex-1 space-y-2 overflow-y-auto px-3 py-4 sm:px-5" role="log" aria-label={`Chat with ${other.name}`}>
        {hasOlder && !search && <div className="text-center"><Button variant="ghost" size="sm" onClick={loadOlder}>Load earlier messages</Button></div>}
        {messages.length === 0 && (
          <p className="mx-auto max-w-xs py-10 text-center text-sm text-fg-muted">Say hi to {first}. Only the two of you can read this chat.</p>
        )}
        {shown.map((m, i) => {
          const mine = m.sender_id === viewerId;
          const prev = shown[i - 1];
          const newDay = !prev || prev.created_at.slice(0, 10) !== m.created_at.slice(0, 10);
          const read = mine && otherRead && otherRead >= m.created_at;
          const quoted = m.reply_to ? byId.get(m.reply_to) : null;
          const g = m.goal_id ? goals.get(m.goal_id) : null;
          return (
            <div key={m.id}>
              {newDay && <p className="my-3 text-center text-xs text-fg-subtle">{formatDate(m.created_at, { weekday: "short", day: "numeric", month: "short" })}</p>}
              <div className={cn("group flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[82%] rounded-2xl px-3 py-2 text-[15px] shadow-sm", mine ? "rounded-br-md bg-primary text-primary-fg" : "rounded-bl-md bg-surface-muted")}>
                  {quoted && (
                    <p className={cn("mb-1 border-l-2 pl-2 text-xs", mine ? "border-white/50 text-white/80" : "border-primary text-fg-muted")}>
                      {quoted.deleted_at ? "Deleted message" : quoted.body ?? quoted.attachment_name ?? "Attachment"}
                    </p>
                  )}
                  {m.deleted_at ? <p className="italic opacity-70">Message deleted</p> : (
                    <>
                      {m.kind === "image" && m.attachment_path && (urls[m.attachment_path]
                        // eslint-disable-next-line @next/next/no-img-element
                        ? <a href={urls[m.attachment_path]} target="_blank" rel="noreferrer"><img src={urls[m.attachment_path]} alt={m.attachment_name ?? "Photo"} className="mb-1 max-h-64 rounded-xl" /></a>
                        : <p className="text-sm opacity-80">Loading photo…</p>)}
                      {m.kind === "file" && m.attachment_path && (
                        <a href={urls[m.attachment_path] ?? "#"} target="_blank" rel="noreferrer" className="mb-1 flex items-center gap-2 underline">
                          <FileText className="size-4 shrink-0" aria-hidden /><span className="truncate">{m.attachment_name}</span>
                          {m.attachment_size ? <span className="text-xs opacity-75">{Math.ceil(m.attachment_size / 1024)} KB</span> : null}
                        </a>
                      )}
                      {m.kind === "voice" && m.attachment_path && (urls[m.attachment_path]
                        ? <audio controls src={urls[m.attachment_path]} className="h-10 max-w-60" preload="metadata" />
                        : <p className="text-sm opacity-80">Voice note…</p>)}
                      {m.kind === "goal" && (
                        <div className={cn("mb-1 rounded-xl p-2.5", mine ? "bg-white/15" : "bg-surface")}>
                          <p className="flex items-center gap-1.5 text-xs opacity-80"><Target className="size-3.5" aria-hidden /> Goal</p>
                          {g ? (
                            <>
                              <p className="font-medium">{g.title}</p>
                              {g.target != null && <><Progress value={(Number(g.progress) / Number(g.target)) * 100} className="mt-1.5" label={g.title} /><p className="mt-1 text-xs opacity-80">{g.progress} / {g.target} {g.unit}</p></>}
                            </>
                          ) : <p className="text-sm opacity-80">Not shared with you</p>}
                        </div>
                      )}
                      {m.kind === "focus_invite" && (
                        <div className={cn("mb-1 rounded-xl p-2.5", mine ? "bg-white/15" : "bg-surface")}>
                          <p className="flex items-center gap-1.5 font-medium"><Timer className="size-4" aria-hidden /> Focus together: {m.focus_minutes} min</p>
                          {!mine && <Link href={`/tools/pomodoro?label=${encodeURIComponent(`Focus with ${first}`)}`} className="mt-1 inline-block text-sm font-semibold text-primary">Start my timer</Link>}
                          <p className="mt-1 text-xs opacity-75">Each of you runs your own timer. Check in when it ends.</p>
                        </div>
                      )}
                      {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                    </>
                  )}
                  <p className={cn("mt-0.5 flex items-center justify-end gap-1 text-[11px]", mine ? "text-white/75" : "text-fg-subtle")}>
                    {m.edited_at && !m.deleted_at && "edited · "}{time(m.created_at)}
                    {mine && (read ? <CheckCheck className="size-3.5" aria-label="Read" /> : <Check className="size-3.5" aria-label="Sent" />)}
                  </p>
                </div>
                {!m.deleted_at && (
                  <div className={cn("flex items-center gap-0.5 self-center opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100", mine ? "order-first mr-1" : "ml-1")}>
                    {sendable && <button type="button" onClick={() => setReplyTo(m)} className="rounded p-1 text-fg-subtle hover:text-fg" aria-label="Reply"><CornerUpLeft className="size-4" aria-hidden /></button>}
                    {mine && m.kind === "text" && <button type="button" onClick={() => { setEditing(m); setText(m.body ?? ""); }} className="rounded p-1 text-fg-subtle hover:text-fg" aria-label="Edit"><Pencil className="size-4" aria-hidden /></button>}
                    {mine && <button type="button" onClick={() => remove(m)} className="rounded p-1 text-fg-subtle hover:text-danger" aria-label="Delete"><Trash2 className="size-4" aria-hidden /></button>}
                    {!mine && <button type="button" onClick={() => report(m)} className="rounded p-1 text-fg-subtle hover:text-danger" aria-label="Report message"><Flag className="size-4" aria-hidden /></button>}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {typing && <p className="pl-1 text-sm text-fg-muted">{first} is typing…</p>}
        <div ref={bottomRef} />
      </div>

      {error && <p className="border-t border-border bg-surface-muted px-4 py-2 text-sm" role="status">{error}</p>}
      {!sendable ? (
        <p className="border-t border-border px-4 py-3 text-center text-sm text-fg-muted">
          {blocked ? <>You blocked {first}. <button type="button" className="text-primary" onClick={toggleBlock}>Unblock</button></> : "This chat is read-only because the partnership ended or someone was blocked."}
        </p>
      ) : (
        <div className="border-t border-border p-2 sm:p-3">
          {(replyTo || editing) && (
            <div className="mb-2 flex items-center justify-between rounded-lg bg-surface-muted px-3 py-1.5 text-xs">
              <span className="truncate">{editing ? "Editing message" : `Replying to: ${replyTo?.body ?? replyTo?.attachment_name ?? "attachment"}`}</span>
              <button type="button" onClick={() => { setReplyTo(null); if (editing) { setEditing(null); setText(""); } }} aria-label="Cancel"><X className="size-4" aria-hidden /></button>
            </div>
          )}
          {!editing && !recording && (
            <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1">
              {QUICK.map((q) => <button key={q} type="button" disabled={busy} onClick={() => insert({ kind: "quick", body: q })} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-muted">{q}</button>)}
              <button type="button" onClick={() => setPicker(picker === "focus" ? null : "focus")} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-muted">⏱ Focus together</button>
              {myGoals.length > 0 && <button type="button" onClick={() => setPicker(picker === "goal" ? null : "goal")} className="shrink-0 rounded-full border border-border px-3 py-1 text-xs hover:bg-surface-muted">🎯 Share a goal</button>}
            </div>
          )}
          {picker === "focus" && (
            <div className="mb-2 flex flex-wrap gap-2">
              {[25, 45, 60, 90].map((n) => <Button key={n} size="sm" variant="outline" disabled={busy} onClick={async () => { if (await insert({ kind: "focus_invite", focus_minutes: n, body: null })) setPicker(null); }}>{n} min</Button>)}
            </div>
          )}
          {picker === "goal" && (
            <div className="mb-2 flex max-h-32 flex-col gap-1 overflow-y-auto">
              {myGoals.map((g) => <button key={g.id} type="button" disabled={busy} className="rounded-lg px-3 py-1.5 text-left text-sm hover:bg-surface-muted"
                onClick={async () => { if (await insert({ kind: "goal", goal_id: g.id, body: null })) setPicker(null); }}>{g.title}</button>)}
            </div>
          )}
          {recording ? (
            <div className="flex items-center gap-2">
              <span className="flex flex-1 items-center gap-2 text-sm text-danger"><span className="size-2.5 animate-pulse rounded-full bg-danger" aria-hidden /> Recording… <RecTimer since={recording.started} /></span>
              <Button variant="ghost" size="sm" onClick={() => stopVoice(true)}>Cancel</Button>
              <Button size="sm" onClick={() => stopVoice()}><Square className="size-4" aria-hidden /> Send</Button>
            </div>
          ) : (
            <form onSubmit={submit} className="flex items-end gap-1.5">
              <input ref={fileRef} type="file" className="hidden" onChange={onFile} accept={ALLOWED.join(",")} />
              <Button type="button" variant="ghost" size="icon" aria-label="Attach a file" disabled={busy} onClick={() => fileRef.current?.click()}><Paperclip className="size-5" aria-hidden /></Button>
              <textarea value={text} onChange={(e) => onType(e.target.value)} rows={1} maxLength={4000} placeholder="Message"
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); e.currentTarget.form?.requestSubmit(); } }}
                className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-border bg-surface px-3.5 py-2 text-[15px] outline-none focus:border-primary" aria-label="Message" />
              {text.trim() ? (
                <Button type="submit" size="icon" disabled={busy} aria-label={editing ? "Save edit" : "Send"}><Send className="size-5" aria-hidden /></Button>
              ) : (
                <Button type="button" size="icon" variant="secondary" disabled={busy} aria-label="Record a voice note" onClick={startVoice}><Mic className="size-5" aria-hidden /></Button>
              )}
            </form>
          )}
          <p className="mt-1 text-center text-[11px] text-fg-subtle">Private between you and {first}. Sponsors and admins can&apos;t read it. Not end-to-end encrypted.</p>
        </div>
      )}
    </div>
  );
}

function RecTimer({ since }: { since: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(t); }, []);
  const s = Math.floor((now - since) / 1000);
  return <span className="tabular-nums">{Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}</span>;
}
