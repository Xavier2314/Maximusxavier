"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, LifeBuoy, LoaderCircle, MessageCircle, Sparkles, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ComplaintForm } from "@/components/complaint-form";
import { RichText } from "@/components/rich-text";
import { MicButton, ReadAloud } from "@/components/voice";
import { cn } from "@/lib/utils";

type Msg = { id: string; role: "user" | "assistant"; content: string };
const SUGGESTIONS = ["Where do I record an Upwork order?", "How do I check in?", "Help me plan my week", "I want to make a complaint"];

/** Floating "Ask Maximus" bubble: chat with the AI, find anything in the app, or send a complaint. */
export function ChatWidget({ firstName, assistant = "Maximus" }: { firstName: string; assistant?: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "complaint">("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [convId, setConvId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ block: "end" }); }, [messages, open]);
  useEffect(() => { if (open) setOpen(false); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  if (pathname.startsWith("/ai")) return null; // the full chat page is already open

  async function send(text: string) {
    const content = text.trim();
    if (!content || streaming) return;
    if (/complain|complaint|report a problem/i.test(content) && messages.length === 0) setTab("complaint");
    setInput("");
    const aid = crypto.randomUUID();
    setMessages((m) => [...m, { id: crypto.randomUUID(), role: "user", content }, { id: aid, role: "assistant", content: "" }]);
    setStreaming(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: convId, message: `${content}\n\n(I'm on the ${pathname} page.)` }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({ error: "Something went wrong." }));
        throw new Error(body.error ?? "Something went wrong.");
      }
      const id = res.headers.get("X-Conversation-Id");
      if (id) setConvId(id);
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setMessages((m) => m.map((x) => (x.id === aid ? { ...x, content: x.content + chunk } : x)));
      }
    } catch (e) {
      setMessages((m) => m.map((x) => (x.id === aid ? { ...x, content: e instanceof Error ? e.message : "Something went wrong." } : x)));
    } finally {
      setStreaming(false);
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label={open ? `Close ${assistant} assistant` : `Ask ${assistant}`}
        className="bottom-bar fixed bottom-24 right-4 z-40 flex h-14 items-center gap-2 rounded-full bg-brand-navy pl-4 pr-5 text-white shadow-xl ring-1 ring-white/10 transition-transform hover:scale-105 lg:bottom-6 lg:right-6 dark:bg-primary">
        {open ? <X className="size-5" aria-hidden /> : <MessageCircle className="size-5 text-brand-lime dark:text-white" aria-hidden />}
        <span className="text-sm font-semibold">{open ? "Close" : `Ask ${assistant}`}</span>
      </button>

      {open && (
        <section role="dialog" aria-label={`${assistant} assistant`}
          className="card fixed inset-x-3 bottom-40 top-20 z-40 flex flex-col overflow-hidden animate-rise sm:inset-x-auto sm:right-6 sm:top-auto sm:h-[600px] sm:max-h-[calc(100vh-8rem)] sm:w-[400px] lg:bottom-24">
          <header className="flex items-center gap-3 bg-brand-navy px-4 py-3 text-white">
            <span className="grid size-9 place-items-center rounded-xl bg-white/10">{assistant === "Maximus" ? <Logo variant="mark" className="h-5 w-auto" title="Maximus" /> : <span className="text-sm font-bold">{assistant.slice(0, 1).toUpperCase()}</span>}</span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold leading-tight">{assistant} assistant</p>
              <p className="text-xs text-white/60">Ask anything, find any page, or send a complaint</p>
            </div>
          </header>
          <div className="flex border-b border-border text-sm font-medium" role="tablist">
            {([["chat", "Ask", Sparkles], ["complaint", "Complaint", LifeBuoy]] as const).map(([k, l, Icon]) => (
              <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}
                className={cn("flex flex-1 items-center justify-center gap-1.5 py-2.5", tab === k ? "border-b-2 border-primary text-primary" : "text-fg-muted")}>
                <Icon className="size-4" aria-hidden />{l}
              </button>
            ))}
          </div>

          {tab === "complaint" ? (
            <div className="flex-1 overflow-y-auto p-4">
              <p className="mb-3 text-sm text-fg-muted">Tell the admin team what happened. You&apos;ll get a notification when they respond.</p>
              <ComplaintForm page={pathname} compact />
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length === 0 && (
                  <div className="space-y-3">
                    <p className="text-sm">Hi {firstName} 👋 I can answer questions, show you where things are in {assistant}, or help you plan. Type or tap <b>Speak</b>.</p>
                    <div className="flex flex-wrap gap-2">
                      {SUGGESTIONS.map((s) => (
                        <button key={s} type="button" onClick={() => (s.includes("complaint") ? setTab("complaint") : void send(s))}
                          className="rounded-full border border-border px-3 py-1.5 text-xs hover:border-primary hover:text-primary">{s}</button>
                      ))}
                    </div>
                  </div>
                )}
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.role === "user" && "justify-end")}>
                    <div className={cn("max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm", m.role === "user" ? "bg-primary text-white" : "bg-surface-muted")}>
                      {m.content ? (m.role === "assistant" ? <RichText text={m.content} /> : <p className="whitespace-pre-line">{m.content}</p>)
                        : <LoaderCircle className="size-4 animate-spin text-fg-subtle" aria-label="Thinking" />}
                      {m.role === "assistant" && m.content && !streaming && <ReadAloud text={m.content.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").replace(/[*_#`>|]+/g, " ")} label="Listen" className="mt-2 h-8 bg-surface" />}
                    </div>
                  </div>
                ))}
                <div ref={endRef} />
              </div>
              <form className="border-t border-border p-2.5" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
                <div className="flex items-end gap-2">
                  <textarea value={input} onChange={(e) => setInput(e.target.value)} rows={1} maxLength={2000}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(input); } }}
                    placeholder={`Ask ${assistant}…`} aria-label="Message"
                    className="max-h-28 min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-surface px-3 py-2 text-sm focus:border-primary focus:outline-none" />
                  <button type="submit" disabled={!input.trim() || streaming} aria-label="Send"
                    className="grid size-10 place-items-center rounded-xl bg-primary text-white disabled:opacity-50">
                    {streaming ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowUp className="size-4" />}
                  </button>
                </div>
                <div className="mt-2"><MicButton onText={(t) => setInput((cur) => (cur ? `${cur.replace(/\s+$/, "")} ${t}` : t))} /></div>
              </form>
            </>
          )}
        </section>
      )}
    </>
  );
}
