"use client";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { DateTime } from "luxon";
import { BookMarked, BookOpen, Check, Flame, HandHeart, NotebookPen, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, SectionTitle, Segmented, Select, Sheet, Skeleton, Textarea, clsx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/client/api";
import { useCollection, useProfile } from "@/lib/client/hooks";
import { BOOKS, PRESETS, TOTAL_CHAPTERS, generatePlan, readingLabel, type PlanDay } from "@/lib/bible";
import { streaks } from "@/lib/stats";

interface Plan { id: string; name: string; start_date: string; days: number; books: string[]; schedule: PlanDay[]; active: boolean }
interface Progress { id: string; plan_id: string | null; book: string; chapter: number; read_on: string }
interface Prayer { id: string; entry_date: string; title: string; body: string | null; answered: boolean; answered_at: string | null }
interface Reflection { id: string; entry_date: string; kind: "reflection" | "gratitude" | "sermon"; title: string | null; body: string; scripture_refs: string[] }
interface Verse { id: string; reference: string; verse_text: string | null; translation: string | null; note: string | null }

type Tab = "today" | "plans" | "journal" | "verses";

export default function SpiritualPage() {
  return <Suspense fallback={<Skeleton className="h-96" />}><Spiritual /></Suspense>;
}

function Spiritual() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "today");
  return (
    <div className="space-y-5">
      <PageHeader title="Spiritual growth" subtitle="Your 5:00 AM time with God — reading, prayer and reflection." />
      <Segmented value={tab} onChange={setTab} options={[{ value: "today", label: "Today" }, { value: "plans", label: "Plans" }, { value: "journal", label: "Journal" }, { value: "verses", label: "Verses" }]} />
      {tab === "today" && <Today />}
      {tab === "plans" && <Plans />}
      {tab === "journal" && <Journal />}
      {tab === "verses" && <Verses />}
    </div>
  );
}

function Today() {
  const { today } = useProfile();
  const plans = useCollection<Plan>("bible_reading_plans", "f.active=true");
  const progress = useCollection<Progress>("bible_reading_progress", "limit=1000");
  const toast = useToast();
  const [passage, setPassage] = useState<{ ref: string; data?: { reference: string; translation: string; verses: { verse: number; text: string }[] }; error?: string } | null>(null);

  if (!plans.rows || !progress.rows) return <Skeleton className="h-64" />;
  const plan = plans.rows[0];
  const readDates = [...new Set(progress.rows.map((p) => p.read_on))];
  const st = streaks(readDates, today);
  const total = progress.rows.length;

  async function openPassage(ref: string) {
    setPassage({ ref });
    try {
      const data = await api<{ reference: string; translation: string; verses: { verse: number; text: string }[] }>(`/api/bible/passage?ref=${encodeURIComponent(ref)}`);
      setPassage({ ref, data });
    } catch (e) {
      setPassage({ ref, error: e instanceof Error ? e.message : "Unavailable" });
    }
  }

  const todayPlan = plan?.schedule.find((d) => d.date === today);
  const isRead = (b: string, c: number) => progress.rows!.some((p) => p.plan_id === plan?.id && p.book === b && p.chapter === c);
  const behind = plan ? plan.schedule.filter((d) => d.date < today && d.readings.some((r) => !isRead(r.book, r.chapter))).length : 0;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-xs text-muted">Reading streak</p><p className="mt-1 flex items-center gap-1 font-display text-2xl font-semibold"><Flame className="h-5 w-5 text-warn" />{st.current}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Chapters read</p><p className="mt-1 font-display text-2xl font-semibold">{total}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Bible progress</p><p className="mt-1 font-display text-2xl font-semibold">{Math.round((new Set(progress.rows.map((p) => `${p.book} ${p.chapter}`)).size / TOTAL_CHAPTERS) * 100)}%</p></Card>
      </div>

      {!plan ? (
        <EmptyState icon={<BookOpen className="h-8 w-8" />} title="No reading plan yet" body="Create one in the Plans tab — I'll spread the chapters evenly over the days you choose." />
      ) : (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <div><p className="text-xs text-muted">{plan.name}</p><p className="font-display text-xl font-semibold">Today&apos;s reading</p></div>
            {behind > 0 && <Badge color="#b7791f">{behind} day{behind > 1 ? "s" : ""} to catch up</Badge>}
          </div>
          {!todayPlan ? <p className="mt-3 text-sm text-muted">{today < plan.start_date ? `Plan starts ${plan.start_date}.` : "This plan is complete. 🎉"}</p> : (
            <ul className="mt-3 space-y-2">
              {todayPlan.readings.map((r) => {
                const done = isRead(r.book, r.chapter);
                return (
                  <li key={`${r.book}${r.chapter}`} className="flex items-center gap-3">
                    <button aria-pressed={done} aria-label={`Mark ${r.book} ${r.chapter} read`} onClick={async () => {
                      if (done) { const row = progress.rows!.find((p) => p.plan_id === plan.id && p.book === r.book && p.chapter === r.chapter); if (row) await progress.remove(row.id); }
                      else { await progress.create({ plan_id: plan.id, book: r.book, chapter: r.chapter, read_on: today }); toast.show("success", `${r.book} ${r.chapter} recorded.`); }
                    }} className={clsx("flex h-7 w-7 items-center justify-center rounded-lg border", done ? "border-sage bg-sage text-white" : "border-line")}>{done && <Check className="h-4 w-4" />}</button>
                    <span className={clsx("flex-1 font-medium", done && "text-muted line-through")}>{r.book} {r.chapter}</span>
                    <Button size="sm" variant="ghost" onClick={() => openPassage(`${r.book} ${r.chapter}`)}>Read</Button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      )}

      <QuickReflection />

      <Sheet open={!!passage} onClose={() => setPassage(null)} title={passage?.data?.reference ?? passage?.ref}>
        {!passage?.data && !passage?.error && <Skeleton className="h-64" />}
        {passage?.error && <p className="text-sm text-muted">{passage.error} Open your own Bible for {passage.ref}.</p>}
        {passage?.data && (
          <div className="space-y-2 font-display text-[17px] leading-relaxed">
            {passage.data.verses.map((v) => <p key={v.verse}><sup className="mr-1 font-sans text-xs text-muted">{v.verse}</sup>{v.text}</p>)}
            <p className="pt-3 font-sans text-xs text-muted">{passage.data.translation} — public domain, via bible-api.com.</p>
          </div>
        )}
      </Sheet>
    </div>
  );
}

function QuickReflection() {
  const { today } = useProfile();
  const refl = useCollection<Reflection>("reflections", `f.entry_date=${today}`);
  const [body, setBody] = useState("");
  const [kind, setKind] = useState<Reflection["kind"]>("reflection");
  const [refs, setRefs] = useState("");
  const toast = useToast();
  return (
    <Card className="p-5">
      <p className="mb-3 flex items-center gap-2 font-semibold"><NotebookPen className="h-4 w-4 text-lavender" /> Today&apos;s reflection</p>
      {refl.rows?.map((r) => <div key={r.id} className="mb-2 rounded-xl bg-surface-2/60 p-3 text-sm"><Badge>{r.kind}</Badge> <span className="whitespace-pre-wrap">{r.body}</span></div>)}
      <Segmented className="mb-3" value={kind} onChange={setKind} options={[{ value: "reflection", label: "Reflection" }, { value: "gratitude", label: "Gratitude" }, { value: "sermon", label: "Sermon notes" }]} />
      <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={kind === "gratitude" ? "Today I'm grateful for…" : kind === "sermon" ? "Key points from the message…" : "What is God teaching me today?"} />
      <Input className="mt-2" value={refs} onChange={(e) => setRefs(e.target.value)} placeholder="Scripture references (e.g. John 15:5, Psalm 23)" />
      <Button className="mt-3" disabled={!body.trim()} onClick={async () => {
        await refl.create({ entry_date: today, kind, body, scripture_refs: refs.split(",").map((s) => s.trim()).filter(Boolean) });
        setBody(""); setRefs(""); toast.show("success", "Saved privately.");
      }}>Save</Button>
    </Card>
  );
}

function Plans() {
  const { today } = useProfile();
  const plans = useCollection<Plan>("bible_reading_plans");
  const toast = useToast();
  const [preset, setPreset] = useState(PRESETS[0].id);
  const [custom, setCustom] = useState<string[]>([]);
  const [days, setDays] = useState(365);
  const [start, setStart] = useState(today);
  const books = preset === "custom" ? custom : PRESETS.find((p) => p.id === preset)!.books;
  const preview = useMemo(() => generatePlan(books, start, days), [books, start, days]);
  const chapters = preview.reduce((s, d) => s + d.readings.length, 0);

  return (
    <div className="space-y-5">
      <Card className="space-y-4 p-5">
        <p className="font-semibold">Create a reading plan</p>
        <Field label="Plan">
          <Select value={preset} onChange={(e) => { setPreset(e.target.value); const p = PRESETS.find((x) => x.id === e.target.value); if (p) setDays(p.days); }}>
            {PRESETS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            <option value="custom">Custom — choose books</option>
          </Select>
        </Field>
        {preset === "custom" && (
          <div className="flex max-h-48 flex-wrap gap-1.5 overflow-y-auto">
            {BOOKS.map(([b]) => <button key={b} onClick={() => setCustom(custom.includes(b) ? custom.filter((x) => x !== b) : [...custom, b])} className={clsx("rounded-full px-2.5 py-1 text-xs", custom.includes(b) ? "bg-lavender text-white" : "bg-surface-2 text-ink-2")}>{b}</button>)}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date"><Input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
          <Field label="Number of days"><Input type="number" min={1} max={3650} value={days} onChange={(e) => setDays(Math.max(1, Number(e.target.value)))} /></Field>
        </div>
        <p className="text-sm text-muted">{chapters} chapters over {preview.length} days ≈ {(chapters / Math.max(1, preview.length)).toFixed(1)} per day. Day 1: {preview[0] ? readingLabel(preview[0].readings) : "—"}</p>
        <Button disabled={!books.length} onClick={async () => {
          for (const p of plans.rows ?? []) if (p.active) await plans.update(p.id, { active: false });
          await plans.create({ name: preset === "custom" ? `Custom plan (${books.length} books)` : PRESETS.find((p) => p.id === preset)!.name, start_date: start, days: preview.length, books, schedule: preview, active: true });
          toast.show("success", "Reading plan created.");
        }}>Create plan</Button>
      </Card>
      <SectionTitle>Your plans</SectionTitle>
      {!plans.rows ? <Skeleton className="h-24" /> : plans.rows.length === 0 ? <EmptyState title="No plans yet" /> : (
        <Card className="divide-y divide-line">
          {plans.rows.map((p) => (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <div className="min-w-0 flex-1"><p className="font-medium">{p.name} {p.active && <Badge color="#6f9a7c">active</Badge>}</p><p className="text-xs text-muted">From {p.start_date} · {p.days} days</p></div>
              {!p.active && <Button size="sm" variant="secondary" onClick={async () => { for (const x of plans.rows!) if (x.active) await plans.update(x.id, { active: false }); await plans.update(p.id, { active: true }); }}>Make active</Button>}
              <Button size="icon" variant="ghost" aria-label="Delete plan" onClick={() => plans.remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}

function Journal() {
  const { today } = useProfile();
  const prayers = useCollection<Prayer>("prayer_journal");
  const refl = useCollection<Reflection>("reflections");
  const [adding, setAdding] = useState(false);
  const [np, setNp] = useState({ title: "", body: "" });
  return (
    <div className="space-y-6">
      <section>
        <SectionTitle action={<Button size="sm" variant="soft" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> Prayer</Button>}>Prayer journal</SectionTitle>
        {!prayers.rows ? <Skeleton className="h-24" /> : prayers.rows.length === 0 ? <EmptyState icon={<HandHeart className="h-8 w-8" />} title="No prayer requests yet" body="Write down what you're praying for and mark answered prayers." /> : (
          <div className="space-y-2">
            {prayers.rows.map((p) => (
              <Card key={p.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div><p className={clsx("font-medium", p.answered && "text-sage")}>{p.title}</p><p className="text-xs text-muted">{DateTime.fromISO(p.entry_date).toFormat("d LLL yyyy")}{p.answered && p.answered_at ? ` · answered ${DateTime.fromISO(p.answered_at).toFormat("d LLL")}` : ""}</p></div>
                  <div className="flex gap-1">
                    <Button size="sm" variant={p.answered ? "sage" : "secondary"} onClick={() => prayers.update(p.id, { answered: !p.answered, answered_at: p.answered ? null : today })}>{p.answered ? "Answered ✓" : "Mark answered"}</Button>
                    <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => prayers.remove(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {p.body && <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{p.body}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>
      <section>
        <SectionTitle>Reflections, gratitude & sermon notes</SectionTitle>
        {!refl.rows ? <Skeleton className="h-24" /> : refl.rows.length === 0 ? <EmptyState title="Nothing written yet" body="Add one from the Today tab." /> : (
          <div className="space-y-2">
            {refl.rows.map((r) => (
              <Card key={r.id} className="p-4">
                <div className="flex items-center justify-between"><span className="text-xs text-muted">{DateTime.fromISO(r.entry_date).toFormat("ccc d LLL yyyy")} · <Badge>{r.kind}</Badge></span><Button size="icon" variant="ghost" aria-label="Delete" onClick={() => refl.remove(r.id)}><Trash2 className="h-4 w-4" /></Button></div>
                <p className="mt-1 whitespace-pre-wrap text-[15px]">{r.body}</p>
                {r.scripture_refs.length > 0 && <p className="mt-1 text-xs text-lavender">{r.scripture_refs.join(" · ")}</p>}
              </Card>
            ))}
          </div>
        )}
      </section>
      <Sheet open={adding} onClose={() => setAdding(false)} title="New prayer" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={!np.title.trim()} onClick={async () => { await prayers.create({ ...np, entry_date: today }); setNp({ title: "", body: "" }); setAdding(false); }}>Save</Button></div>}>
        <div className="space-y-3"><Field label="Prayer request"><Input value={np.title} onChange={(e) => setNp({ ...np, title: e.target.value })} /></Field><Field label="Details (private)"><Textarea value={np.body} onChange={(e) => setNp({ ...np, body: e.target.value })} /></Field></div>
      </Sheet>
    </div>
  );
}

function Verses() {
  const verses = useCollection<Verse>("saved_verses");
  const [v, setV] = useState({ reference: "", verse_text: "", translation: "", note: "" });
  return (
    <div className="space-y-5">
      <Card className="space-y-3 p-5">
        <p className="font-semibold">Save a verse</p>
        <Field label="Reference"><Input value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} placeholder="e.g. Philippians 4:13" /></Field>
        <Field label="Verse text (copy from your Bible)" hint="Paste from your own Bible — MY RHYTHM never generates Scripture text."><Textarea value={v.verse_text} onChange={(e) => setV({ ...v, verse_text: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Translation"><Input value={v.translation} onChange={(e) => setV({ ...v, translation: e.target.value })} placeholder="e.g. KJV" /></Field>
          <Field label="Note"><Input value={v.note} onChange={(e) => setV({ ...v, note: e.target.value })} /></Field>
        </div>
        <Button disabled={!v.reference.trim()} onClick={async () => { await verses.create(v); setV({ reference: "", verse_text: "", translation: "", note: "" }); }}><BookMarked className="h-4 w-4" /> Save verse</Button>
      </Card>
      {!verses.rows ? <Skeleton className="h-24" /> : verses.rows.length === 0 ? <EmptyState title="No saved verses yet" /> : (
        <div className="grid gap-3 md:grid-cols-2">
          {verses.rows.map((x) => (
            <Card key={x.id} className="p-4">
              <div className="flex items-center justify-between"><p className="font-semibold text-lavender">{x.reference}{x.translation ? ` (${x.translation})` : ""}</p><Button size="icon" variant="ghost" aria-label="Delete" onClick={() => verses.remove(x.id)}><Trash2 className="h-4 w-4" /></Button></div>
              {x.verse_text && <p className="mt-1 font-display text-[16px] leading-relaxed">{x.verse_text}</p>}
              {x.note && <p className="mt-1 text-sm text-muted">{x.note}</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
