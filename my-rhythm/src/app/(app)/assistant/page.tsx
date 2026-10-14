"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowUp, History, MessageSquarePlus, Sparkles } from "lucide-react";
import { Button, Card, PageHeader, Sheet, Skeleton, Textarea, clsx } from "@/components/ui";
import { api, useApi } from "@/lib/client/api";
import { useToast } from "@/components/toast";

interface Msg { role: "user" | "assistant"; content: string; proposals?: string[] }

const SUGGESTIONS = [
  "What is my schedule today?",
  "What do I have tomorrow?",
  "Am I free on Thursday afternoon?",
  "Find time for the gym this weekend.",
  "Can I attend an event on Friday at 2 PM?",
  "Where can I fit two hours of keyboard practice?",
  "Am I overloading myself?",
  "What have I been consistent with this month?",
  "Help me plan tomorrow.",
  "Which activities did I miss this week?",
];

export default function AssistantPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><Assistant /></Suspense>;
}

function Assistant() {
  const params = useSearchParams();
  const toast = useToast();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const sentInitial = useRef(false);
  const { data: convs, mutate: refreshConvs } = useApi<{ conversations: { id: string; title: string; updated_at: string }[] }>(showHistory ? "/api/ai/conversations" : null);

  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, busy]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: msg }]);
    setBusy(true);
    try {
      const res = await api<{ conversationId: string; reply: string; proposals: string[] }>("/api/ai/chat", { body: { conversationId, message: msg } });
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: res.reply, proposals: res.proposals }]);
    } catch (e) {
      const err = e instanceof Error ? e.message : "Something went wrong";
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${err}` }]);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    const q = params.get("q");
    if (q && !sentInitial.current) {
      sentInitial.current = true;
      send(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  async function openConversation(id: string) {
    const res = await api<{ messages: { role: "user" | "assistant"; content: string; proposal_id: string | null }[] }>(`/api/ai/conversations?id=${id}`);
    setConversationId(id);
    setMessages(res.messages.map((m) => ({ role: m.role, content: m.content, proposals: m.proposal_id ? [m.proposal_id] : undefined })));
    setShowHistory(false);
  }

  return (
    <div className="flex min-h-[calc(100dvh-180px)] flex-col">
      <PageHeader
        title="Ask MY RHYTHM"
        subtitle="Answers come from your real schedule. Changes are only proposed — you approve them."
        action={
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" aria-label="Conversation history" onClick={() => setShowHistory(true)}><History className="h-5 w-5" /></Button>
            <Button size="icon" variant="ghost" aria-label="New conversation" onClick={() => { setConversationId(null); setMessages([]); }}><MessageSquarePlus className="h-5 w-5" /></Button>
          </div>
        }
      />

      <div className="flex-1 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-4">
            <Card className="flex gap-3 bg-lavender-soft/60 p-4">
              <Sparkles className="h-5 w-5 shrink-0 text-lavender" />
              <p className="text-[15px]">Hi! I can check your schedule, find free time, spot overload, and draft changes for your approval. What would you like to know?</p>
            </Card>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => <button key={s} onClick={() => send(s)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2">{s}</button>)}
            </div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={clsx("max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap", m.role === "user" ? "rounded-br-md bg-navy text-white dark:bg-lavender dark:text-[#08101f]" : "rounded-bl-md border border-line bg-surface")}>
              <FormattedText text={m.content} />
              {m.proposals?.map((p) => (
                <Link key={p} href={`/proposals/${p}`} className="mt-3 flex items-center justify-center gap-2 rounded-xl bg-lavender px-3 py-2 text-sm font-semibold text-white">
                  Review proposed changes →
                </Link>
              ))}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl border border-line bg-surface px-4 py-3">
              {[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-lavender" style={{ animationDelay: `${d * 120}ms` }} />)}
              <span className="ml-2 text-sm text-muted">Checking your schedule…</span>
            </div>
          </div>
        )}
        <div ref={bottom} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="sticky bottom-24 z-10 mt-4 md:bottom-4">
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-surface p-2 shadow-lg">
          <Textarea value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about your schedule…" rows={1} maxLength={4000}
            className="max-h-40 min-h-[44px] flex-1 resize-none border-0 py-2.5 focus:ring-0"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
          <Button type="submit" size="icon" aria-label="Send" disabled={!input.trim() || busy}><ArrowUp className="h-5 w-5" /></Button>
        </div>
      </form>

      <Sheet open={showHistory} onClose={() => setShowHistory(false)} title="Conversations">
        {!convs ? <Skeleton className="h-40" /> : convs.conversations.length === 0 ? <p className="text-sm text-muted">No saved conversations yet.</p> : (
          <div className="space-y-1">
            {convs.conversations.map((c) => (
              <button key={c.id} onClick={() => openConversation(c.id)} className="block w-full truncate rounded-xl px-3 py-2.5 text-left hover:bg-surface-2">{c.title}</button>
            ))}
            <Button variant="ghost" className="mt-2 text-danger" onClick={async () => { await api("/api/ai/conversations", { method: "DELETE" }); refreshConvs(); toast.show("info", "Conversation history deleted."); }}>Delete all conversations</Button>
          </div>
        )}
      </Sheet>
    </div>
  );
}

/** Minimal formatting: **bold** and bullet lines. Model output is rendered as text (no HTML injection). */
function FormattedText({ text }: { text: string }) {
  return (
    <>
      {text.split("\n").map((line, i) => {
        const parts = line.split(/(\*\*[^*]+\*\*)/g).map((p, j) => (p.startsWith("**") && p.endsWith("**") ? <strong key={j}>{p.slice(2, -2)}</strong> : <span key={j}>{p}</span>));
        return <span key={i} className="block min-h-[0.5em]">{parts}</span>;
      })}
    </>
  );
}
