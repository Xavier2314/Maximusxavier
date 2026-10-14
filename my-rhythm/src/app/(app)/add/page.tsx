"use client";
import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Keyboard, Mic, MicOff, PenLine, Sparkles, TriangleAlert } from "lucide-react";
import { Button, Card, ErrorState, PageHeader, Segmented, Skeleton, Textarea } from "@/components/ui";
import { ActivityForm, emptyForm, formToDraft, type FormValue } from "@/components/ActivityForm";
import { ProposalReview, type ProposalRecord } from "@/components/ProposalReview";
import { useToast } from "@/components/toast";
import { api, useApi } from "@/lib/client/api";
import type { CategoryRow, Profile } from "@/lib/types";

type Mode = "manual" | "ai" | "voice";

const EXAMPLES = [
  "I have a business meeting tomorrow at 11 AM.",
  "I am travelling to Abuja next Monday at 9 AM and returning Tuesday evening.",
  "Add a leadership event on Saturday from 10 AM to 4 PM.",
  "Find two hours for my podcast recording this week.",
  "Schedule one hour of keyboard practice before Friday.",
];

export default function AddPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><AddInner /></Suspense>;
}

function AddInner() {
  const params = useSearchParams();
  const router = useRouter();
  const toast = useToast();
  const { data: cats, error } = useApi<{ categories: CategoryRow[] }>("/api/categories");
  const { data: prof } = useApi<{ profile: Profile }>("/api/profile");
  const tz = prof?.profile?.timezone ?? "Africa/Lagos";
  const [mode, setMode] = useState<Mode>((params.get("mode") as Mode) || "manual");
  const [form, setForm] = useState<FormValue | null>(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<ProposalRecord | null>(null);
  const [clarify, setClarify] = useState<{ question: string; missing: string[] } | null>(null);
  const [assumptions, setAssumptions] = useState<string[]>([]);
  const [engine, setEngine] = useState<string | null>(null);

  useEffect(() => {
    if (prof && !form) setForm(emptyForm(tz, params.get("date") ?? undefined));
  }, [prof, form, tz, params]);

  async function analyzeManual(e: React.FormEvent) {
    e.preventDefault();
    if (!form) return;
    if (!form.title.trim()) return toast.show("error", "Please give it a name.");
    if (form.repeat === "weekly" && !form.by_weekday.length) return toast.show("error", "Pick at least one weekday.");
    setBusy(true);
    try {
      const res = await api<{ proposal: ProposalRecord }>("/api/schedule/analyze", { body: { drafts: [formToDraft(form, tz)], source: "quick_add" } });
      setProposal(res.proposal);
      setAssumptions([]);
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Could not check your schedule");
    } finally {
      setBusy(false);
    }
  }

  async function analyzeText(input: string, source: "ai" | "voice") {
    if (input.trim().length < 2) return;
    setBusy(true);
    setClarify(null);
    try {
      const res = await api<{ status: string; proposal?: ProposalRecord; clarification?: string; missing?: string[]; assumptions?: string[]; engine: string }>("/api/ai/parse", { body: { text: input, source } });
      setEngine(res.engine);
      if (res.status === "proposal" && res.proposal) {
        setProposal(res.proposal);
        setAssumptions(res.assumptions ?? []);
      } else if (res.status === "question") {
        router.push(`/assistant?q=${encodeURIComponent(input)}`);
      } else {
        setClarify({ question: res.clarification ?? "Could you add a few more details?", missing: res.missing ?? [] });
      }
    } catch (err) {
      toast.show("error", err instanceof Error ? err.message : "Could not understand that");
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorState error={error} />;
  if (!cats || !form) return <Skeleton className="h-96" />;

  if (proposal) {
    return (
      <div>
        <PageHeader title="Review before saving" subtitle="Nothing changes until you approve." />
        {assumptions.length > 0 && (
          <Card className="mb-4 flex gap-3 border-warn/40 bg-warn-soft/60 p-3 text-sm">
            <TriangleAlert className="h-4 w-4 shrink-0 text-warn" />
            <div><p className="font-medium">Please double-check{engine === "fallback" ? " (parsed without AI)" : ""}:</p><ul className="list-disc pl-4">{assumptions.map((a) => <li key={a}>{a}</li>)}</ul></div>
          </Card>
        )}
        <ProposalReview proposal={proposal} categories={cats.categories} onDone={(applied) => (applied ? router.push("/") : setProposal(null))} />
        <Button variant="ghost" className="mt-3" onClick={() => setProposal(null)}>← Back to editing</Button>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Quick Add" subtitle="I'll check your real calendar for conflicts before anything is saved." />
      <Segmented
        className="mb-5"
        value={mode}
        onChange={setMode}
        options={[
          { value: "manual", label: <span className="flex items-center gap-1.5"><PenLine className="h-4 w-4" /> Manual</span> },
          { value: "ai", label: <span className="flex items-center gap-1.5"><Sparkles className="h-4 w-4" /> Ask AI</span> },
          { value: "voice", label: <span className="flex items-center gap-1.5"><Mic className="h-4 w-4" /> Voice</span> },
        ]}
      />

      {mode === "manual" && (
        <form onSubmit={analyzeManual}>
          <Card className="p-5"><ActivityForm value={form} onChange={setForm} categories={cats.categories} /></Card>
          <Button type="submit" className="mt-4 w-full" size="lg" loading={busy}>Check schedule &amp; preview</Button>
        </form>
      )}

      {mode === "ai" && (
        <div className="space-y-4">
          <Card className="p-4">
            <Textarea autoFocus value={text} onChange={(e) => setText(e.target.value)} placeholder="Describe it naturally…" className="min-h-[110px] border-0 p-0 text-[17px] focus:ring-0" maxLength={2000}
              onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) analyzeText(text, "ai"); }} />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-muted">Dates are resolved in your timezone ({tz}).</p>
              <Button onClick={() => analyzeText(text, "ai")} loading={busy} disabled={text.trim().length < 2}><Sparkles className="h-4 w-4" /> Preview</Button>
            </div>
          </Card>
          {clarify && <Clarify q={clarify} />}
          <div>
            <p className="mb-2 text-[13px] font-medium text-muted">Try:</p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLES.map((ex) => <button key={ex} onClick={() => setText(ex)} className="rounded-full border border-line bg-surface px-3 py-1.5 text-left text-sm text-ink-2 hover:bg-surface-2">{ex}</button>)}
            </div>
          </div>
        </div>
      )}

      {mode === "voice" && <VoiceEntry busy={busy} onSubmit={(t) => analyzeText(t, "voice")} clarify={clarify} />}
    </div>
  );
}

function Clarify({ q }: { q: { question: string; missing: string[] } }) {
  return (
    <Card className="border-lavender/40 bg-lavender-soft/60 p-4 text-sm">
      <p className="font-medium">{q.question}</p>
      {q.missing.length > 0 && <p className="mt-1 text-muted">Missing: {q.missing.join(", ")}. I won&apos;t guess these — please add them to your request.</p>}
    </Card>
  );
}

type SpeechRec = { start: () => void; stop: () => void; abort: () => void; lang: string; interimResults: boolean; continuous: boolean; onresult: ((e: { resultIndex: number; results: ArrayLike<{ 0: { transcript: string }; isFinal: boolean }> }) => void) | null; onerror: ((e: { error: string }) => void) | null; onend: (() => void) | null };

function VoiceEntry({ busy, onSubmit, clarify }: { busy: boolean; onSubmit: (t: string) => void; clarify: { question: string; missing: string[] } | null }) {
  const [supported, setSupported] = useState<boolean | null>(null);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const rec = useRef<SpeechRec | null>(null);

  useEffect(() => {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    setSupported(!!(w.SpeechRecognition || w.webkitSpeechRecognition));
    return () => rec.current?.abort();
  }, []);

  function start() {
    const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const C = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!C) return;
    setErr(null);
    const r = new C();
    r.lang = "en-NG";
    r.interimResults = true;
    r.continuous = false;
    let finalText = "";
    r.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const res = e.results[i];
        if (res.isFinal) finalText += res[0].transcript;
        else interim += res[0].transcript;
      }
      setTranscript((finalText + interim).trim());
    };
    r.onerror = (e) => {
      setErr(e.error === "not-allowed" ? "Microphone permission was denied. Allow it in Settings → Safari (or the app) → Microphone, or type instead." : `Speech recognition stopped (${e.error}). You can type or use the keyboard's dictation key.`);
      setListening(false);
    };
    r.onend = () => setListening(false);
    rec.current = r;
    setTranscript("");
    r.start();
    setListening(true);
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col items-center gap-4 p-6 text-center">
        {supported === false ? (
          <div className="space-y-2 text-sm text-ink-2">
            <Keyboard className="mx-auto h-8 w-8 text-lavender" />
            <p className="font-medium">Live speech recognition isn&apos;t available here.</p>
            <p className="text-muted">On iPhone, tap the text box below and use the <strong>microphone key on the keyboard</strong> to dictate — it works everywhere.</p>
          </div>
        ) : (
          <>
            <button onClick={listening ? () => rec.current?.stop() : start} aria-label={listening ? "Stop listening" : "Start listening"}
              className={`flex h-24 w-24 items-center justify-center rounded-full text-white shadow-lg transition ${listening ? "animate-pulse-ring bg-danger" : "bg-navy dark:bg-lavender"}`}>
              {listening ? <MicOff className="h-10 w-10" /> : <Mic className="h-10 w-10" />}
            </button>
            <p className="text-sm text-muted">{listening ? "Listening… speak your plan" : "Tap and say e.g. “Add a meeting with my team tomorrow by 8 PM.”"}</p>
          </>
        )}
        {err && <p className="text-sm text-danger">{err}</p>}
      </Card>
      <Card className="p-4">
        <p className="mb-2 text-[13px] font-medium text-ink-2">Transcription (edit if needed)</p>
        <Textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} placeholder="Your words will appear here…" />
        <Button className="mt-3 w-full" onClick={() => onSubmit(transcript)} loading={busy} disabled={transcript.trim().length < 2}>Extract &amp; preview</Button>
      </Card>
      {clarify && <Clarify q={clarify} />}
    </div>
  );
}
