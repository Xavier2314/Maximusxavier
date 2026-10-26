"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { ArrowUp, Brain, LoaderCircle, MessageSquarePlus, Plus, Bot, Trash2, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { RichText as Rich } from "@/components/rich-text";
import { Button } from "@/components/ui/button";
import { MicButton, ReadAloud } from "@/components/voice";
import { cn, formatRelative } from "@/lib/utils";
import { addMemoryAction, deleteConversationAction, deleteMemoryAction } from "./actions";

type Msg = { id: string; role: "user" | "assistant"; content: string };

const SUGGESTIONS = [
  "Plan my week so I hit my prospecting target",
  "Write a friendly WhatsApp follow-up for a prospect who went quiet",
  "How do I handle the objection “I don't have money now”?",
  "Analyse my last evaluations and tell me what to improve",
  "How can I support a downline who has lost motivation?",
  "Help me prepare a 5-minute presentation",
];

export function Chat({ conversationId, initialQuestion, conversations, initialMessages, memoryEnabled, memories, firstName, enabled }: {
  conversationId: string | null; initialQuestion?: string; conversations: { id: string; title: string; updated_at: string }[];
  initialMessages: Msg[]; memoryEnabled: boolean; memories: { id: string; content: string }[]; firstName: string; enabled: boolean;
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Msg[]>(initialMessages);
  const [input, setInput] = useState(initialQuestion ?? "");
  const [convId, setConvId] = useState(conversationId);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showMemory, setShowMemory] = useState(false);
  const [memoryText, setMemoryText] = useState("");
  const [memoryMsg, setMemoryMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming || !enabled) return;
    setError(null);
    setInput("");
    const assistantId = crypto.randomUUID();
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content }, { id: assistantId, role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, message: content }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: "Something went wrong." }));
        throw new Error(body.error ?? "Something went wrong.");
      }
      const newId = res.headers.get("X-Conversation-Id");
      if (newId && newId !== convId) {
        setConvId(newId);
        window.history.replaceState(null, "", `/ai?c=${newId}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === assistantId ? { ...x, content: x.content + chunk } : x)));
      }
      router.refresh();
    } catch (e) {
      setMessages((m) => m.filter((x) => x.id !== assistantId || x.content));
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setStreaming(false);
      inputRef.current?.focus();
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
      {/* Conversation history */}
      <aside className="hidden lg:block">
        <Link href="/ai" className="mb-3 flex items-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-sm font-medium text-primary-fg hover:bg-primary-hover">
          <MessageSquarePlus className="size-4" aria-hidden /> New conversation
        </Link>
        <nav aria-label="Conversation history" className="space-y-1">
          {conversations.map((c) => (
            <div key={c.id} className={cn("group flex items-center rounded-xl", c.id === convId ? "bg-surface-muted" : "hover:bg-surface-muted/60")}>
              <Link href={`/ai?c=${c.id}`} className="min-w-0 flex-1 px-3 py-2">
                <span className="block truncate text-sm">{c.title}</span>
                <span className="text-xs text-fg-subtle">{formatRelative(c.updated_at)}</span>
              </Link>
              <button type="button" aria-label={`Delete conversation ${c.title}`} disabled={pending}
                onClick={() => { if (confirm("Delete this conversation?")) start(async () => { await deleteConversationAction(c.id); if (c.id === convId) router.push("/ai"); }); }}
                className="mr-1 grid size-11 place-items-center rounded-lg text-fg-subtle opacity-0 hover:text-danger group-hover:opacity-100 focus:opacity-100">
                <Trash2 className="size-4" aria-hidden />
              </button>
            </div>
          ))}
          {conversations.length === 0 && <p className="px-3 text-sm text-fg-subtle">No conversations yet.</p>}
        </nav>
      </aside>

      <section className="card flex min-h-[70dvh] flex-col overflow-hidden" aria-label="Chat">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-medium"><Bot className="size-4 text-primary" aria-hidden /> Maximus AI</p>
          <div className="flex gap-1">
            <Link href="/ai" className="grid size-11 place-items-center rounded-lg text-fg-muted hover:bg-surface-muted lg:hidden" aria-label="New conversation"><Plus className="size-4" /></Link>
            <Button variant="ghost" size="sm" onClick={() => setShowMemory((s) => !s)} aria-expanded={showMemory}>
              <Brain className="size-4" aria-hidden /> Memory
            </Button>
          </div>
        </div>

        {showMemory && (
          <div className="border-b border-border bg-surface-muted/60 p-4 text-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-medium">What Maximus AI remembers about you</p>
              <button type="button" onClick={() => setShowMemory(false)} aria-label="Close memory panel"><X className="size-4" /></button>
            </div>
            {!memoryEnabled ? (
              <p className="text-fg-muted">Memory is off. <Link href="/settings" className="font-medium text-primary hover:underline">Turn it on in Settings</Link> to let the assistant remember your preferences. You can delete memories anytime.</p>
            ) : (
              <>
                <ul className="mb-3 space-y-1.5">
                  {memories.map((m) => (
                    <li key={m.id} className="flex items-center gap-2 rounded-lg bg-surface px-3 py-2">
                      <span className="flex-1">{m.content}</span>
                      <button type="button" aria-label="Delete memory" onClick={() => start(async () => { await deleteMemoryAction(m.id); })} className="text-fg-subtle hover:text-danger"><Trash2 className="size-3.5" /></button>
                    </li>
                  ))}
                  {memories.length === 0 && <li className="text-fg-subtle">Nothing saved yet.</li>}
                </ul>
                <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); start(async () => { const r = await addMemoryAction(memoryText); setMemoryMsg(r.message); if (r.ok) setMemoryText(""); }); }}>
                  <input value={memoryText} onChange={(e) => setMemoryText(e.target.value)} maxLength={500} placeholder="e.g. I prospect best in the mornings"
                    className="h-9 flex-1 rounded-lg border border-border bg-surface px-3" aria-label="New memory" />
                  <Button type="submit" size="sm" disabled={pending}>Save</Button>
                </form>
                {memoryMsg && <p className="mt-1 text-xs text-fg-muted" role="status">{memoryMsg}</p>}
                {memories.length > 0 && <button type="button" className="mt-2 text-xs text-danger hover:underline" onClick={() => { if (confirm("Delete everything Maximus AI remembers?")) start(async () => { await deleteMemoryAction(null); }); }}>Delete all memories</button>}
              </>
            )}
          </div>
        )}

        <div className="flex-1 space-y-5 overflow-y-auto p-4 sm:p-6" aria-live="polite">
          {messages.length === 0 ? (
            <div className="mx-auto max-w-xl py-8 text-center">
              <Logo variant="mark" className="mx-auto h-14 w-auto" />
              <h2 className="mt-4 text-xl font-bold">How can I help you grow today, {firstName}?</h2>
              <p className="mt-1 text-sm text-fg-muted">I know your goals and recent evaluations, and I answer from approved Maximus materials.</p>
              <div className="mt-6 grid gap-2 sm:grid-cols-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" disabled={!enabled} onClick={() => send(s)}
                    className="rounded-2xl border border-border p-3 text-left text-sm transition-colors hover:border-primary hover:bg-primary-soft disabled:opacity-50">{s}</button>
                ))}
              </div>
            </div>
          ) : messages.map((m) => (
            <div key={m.id} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
              {m.role === "assistant" && (
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-navy"><Logo variant="mark" className="h-5 w-auto" title="Maximus AI" /></span>
              )}
              <div className={cn("max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                m.role === "user" ? "bg-primary text-primary-fg" : "bg-surface-muted")}>
                {m.content ? (m.role === "assistant" ? <Rich text={m.content} /> : <p className="whitespace-pre-line">{m.content}</p>)
                  : <LoaderCircle className="size-4 animate-spin text-fg-subtle" aria-label="Thinking" />}
                {m.role === "assistant" && m.content && !(streaming && m === messages[messages.length - 1]) && (
                  <ReadAloud text={m.content.replace(/[*_#`>|-]+/g, " ")} label="Listen" className="mt-2 h-8 bg-surface" />
                )}
              </div>
            </div>
          ))}
          <div ref={endRef} />
        </div>

        {error && <p className="mx-4 mb-2 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger" role="alert">{error}</p>}
        <form className="border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
          <div className="flex items-end gap-2 rounded-2xl border border-border bg-surface p-2 focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/15">
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={4000}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
              placeholder={enabled ? "Ask Maximus AI anything about growing your business…" : "Maximus AI is not configured yet"}
              disabled={!enabled} aria-label="Message Maximus AI"
              className="max-h-40 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-[15px] focus:outline-none" />
            {enabled && <MicButton onText={(t) => setInput((cur) => (cur ? `${cur.replace(/\s+$/, "")} ${t}` : t))} />}
            <Button type="submit" size="icon" disabled={!input.trim() || streaming || !enabled} aria-label="Send">
              {streaming ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
            </Button>
          </div>
          <p className="mt-1.5 px-1 text-xs text-fg-subtle">Maximus AI can make mistakes. Check important information with your sponsor.</p>
        </form>
      </section>
    </div>
  );
}
