"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { CalendarSearch, Check, ListTodo, Pause, Play, Plus, RotateCcw, Square, Trash2 } from "lucide-react";
import { Badge, Bars, Button, Card, EmptyState, Field, Input, PageHeader, SectionTitle, Segmented, Select, Sheet, Skeleton, Textarea, clsx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api, useApi } from "@/lib/client/api";
import { useCollection, useProfile } from "@/lib/client/hooks";
import { useNow } from "@/lib/client/useNow";
import { durationLabel, t12 } from "@/lib/client/format";
import type { OccurrenceView } from "@/lib/data";

interface Practice { id: string; practice_date: string; started_at: string | null; duration_minutes: number; focus: string | null; notes: string | null }
interface Lesson { id: string; lesson_date: string; attended: boolean; topics: string | null; teacher_feedback: string | null; improvement_areas: string | null; notes: string | null }
interface Item { id: string; kind: string; name: string; details: string | null; status: string; achieved_on: string | null }
interface Task { id: string; lesson_id: string | null; title: string; due_date: string | null; done: boolean }

const KINDS = [["chord_progression", "Chord progressions"], ["scale", "Scales"], ["song", "Songs"], ["exercise", "Exercises"], ["skill", "Skills learned"], ["milestone", "Milestones"]] as const;
const FOCUS = ["Scales", "Chords", "Chord progressions", "Songs", "Sight-reading", "Technique", "Ear training", "Improvisation", "Lesson homework"];

export default function MusicPage() {
  const [tab, setTab] = useState<"practice" | "lessons" | "repertoire" | "report">("practice");
  return (
    <div className="space-y-5">
      <PageHeader title="Keyboard" subtitle="Lessons Mon 10 AM · Tue & Thu 1 PM — practice through the week." />
      <Segmented value={tab} onChange={setTab} options={[{ value: "practice", label: "Practice" }, { value: "lessons", label: "Lessons" }, { value: "repertoire", label: "Repertoire" }, { value: "report", label: "Weekly report" }]} />
      {tab === "practice" && <PracticeTab />}
      {tab === "lessons" && <LessonsTab />}
      {tab === "repertoire" && <RepertoireTab />}
      {tab === "report" && <ReportTab />}
    </div>
  );
}

function PracticeTab() {
  const { today } = useProfile();
  const toast = useToast();
  const sessions = useCollection<Practice>("keyboard_practice_sessions", `from.practice_date=${DateTime.fromISO(today).minus({ days: 60 }).toISODate()}`);
  const tasks = useCollection<Task>("practice_tasks", "f.done=false");
  const now = useNow(1000);
  const [timer, setTimer] = useState<{ startedAt: number | null; accumulated: number }>({ startedAt: null, accumulated: 0 });
  const [focus, setFocus] = useState(FOCUS[0]);
  const [notes, setNotes] = useState("");
  const [manual, setManual] = useState({ minutes: "30", date: today });

  useEffect(() => { try { const t = JSON.parse(localStorage.getItem("myrhythm.practiceTimer") ?? "null"); if (t) setTimer(t); } catch {} }, []);
  const persist = (t: typeof timer) => { setTimer(t); try { localStorage.setItem("myrhythm.practiceTimer", JSON.stringify(t)); } catch {} };
  const elapsed = timer.accumulated + (timer.startedAt ? now - timer.startedAt : 0);
  const mm = Math.floor(elapsed / 60000);
  const ss = Math.floor((elapsed % 60000) / 1000);

  async function save(minutes: number, date: string, startedAt?: string) {
    if (minutes < 1) return toast.show("error", "Practise at least a minute before saving.");
    await sessions.create({ practice_date: date, duration_minutes: minutes, focus, notes: notes || null, started_at: startedAt ?? null });
    setNotes("");
    toast.show("success", `Logged ${durationLabel(minutes)} of ${focus.toLowerCase()} practice.`);
  }

  return (
    <div className="space-y-5">
      <Card className="flex flex-col items-center gap-4 p-6 text-center">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Practice timer</p>
        <p className="font-display text-6xl font-semibold tabular-nums">{String(mm).padStart(2, "0")}:{String(ss).padStart(2, "0")}</p>
        <Select className="max-w-xs" value={focus} onChange={(e) => setFocus(e.target.value)}>{FOCUS.map((f) => <option key={f}>{f}</option>)}</Select>
        <div className="flex gap-2">
          {timer.startedAt ? (
            <Button variant="secondary" onClick={() => persist({ startedAt: null, accumulated: elapsed })}><Pause className="h-4 w-4" /> Pause</Button>
          ) : (
            <Button onClick={() => persist({ startedAt: Date.now(), accumulated: timer.accumulated })}><Play className="h-4 w-4" /> {timer.accumulated ? "Resume" : "Start"}</Button>
          )}
          <Button variant="sage" disabled={elapsed < 60000} onClick={async () => { await save(Math.round(elapsed / 60000), today, DateTime.fromMillis(Date.now() - elapsed).toISO()!); persist({ startedAt: null, accumulated: 0 }); }}><Square className="h-4 w-4" /> Finish & save</Button>
          <Button variant="ghost" onClick={() => persist({ startedAt: null, accumulated: 0 })} aria-label="Reset"><RotateCcw className="h-4 w-4" /></Button>
        </div>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What did you work on?" className="max-w-md" />
      </Card>

      <Card className="flex flex-wrap items-end gap-3 p-4">
        <Field label="Or log a past session (min)"><Input type="number" min={1} max={600} value={manual.minutes} onChange={(e) => setManual({ ...manual, minutes: e.target.value })} className="w-28" /></Field>
        <Field label="Date"><Input type="date" max={today} value={manual.date} onChange={(e) => setManual({ ...manual, date: e.target.value })} /></Field>
        <Button variant="secondary" onClick={() => save(Number(manual.minutes), manual.date)}>Log</Button>
      </Card>

      <section>
        <SectionTitle>Practice tasks from lessons</SectionTitle>
        {!tasks.rows ? <Skeleton className="h-16" /> : tasks.rows.length === 0 ? <p className="text-sm text-muted">No open tasks. Convert lesson notes into tasks in the Lessons tab.</p> : (
          <Card className="divide-y divide-line">
            {tasks.rows.map((t) => (
              <div key={t.id} className="flex items-center gap-3 p-3">
                <button aria-label="Mark done" onClick={() => tasks.update(t.id, { done: true })} className="flex h-6 w-6 items-center justify-center rounded-md border border-line hover:bg-sage hover:text-white"><Check className="h-4 w-4" /></button>
                <span className="flex-1 text-sm">{t.title}</span>
                {t.due_date && <span className="text-xs text-muted">due {DateTime.fromISO(t.due_date).toFormat("d LLL")}</span>}
              </div>
            ))}
          </Card>
        )}
      </section>

      <section>
        <SectionTitle>Recent sessions</SectionTitle>
        {!sessions.rows ? <Skeleton className="h-24" /> : sessions.rows.length === 0 ? <EmptyState title="No practice logged yet" /> : (
          <Card className="divide-y divide-line">
            {sessions.rows.slice(0, 15).map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 text-sm">
                <span className="w-24 text-muted">{DateTime.fromISO(s.practice_date).toFormat("ccc d LLL")}</span>
                <span className="flex-1">{s.focus}{s.notes ? ` — ${s.notes}` : ""}</span>
                <span className="font-medium tabular-nums">{durationLabel(s.duration_minutes)}</span>
                <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => sessions.remove(s.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}

function LessonsTab() {
  const { today, tz } = useProfile();
  const toast = useToast();
  const lessons = useCollection<Lesson>("keyboard_lessons");
  const tasks = useCollection<Task>("practice_tasks");
  const { data: sched } = useApi<{ occurrences: OccurrenceView[] }>(`/api/schedule?from=${today}&to=${DateTime.fromISO(today).plus({ days: 10 }).toISODate()}`);
  const [form, setForm] = useState({ lesson_date: today, attended: true, topics: "", teacher_feedback: "", improvement_areas: "", notes: "" });
  const [convert, setConvert] = useState<Lesson | null>(null);
  const [taskLines, setTaskLines] = useState("");
  const upcoming = (sched?.occurrences ?? []).filter((o) => /keyboard lesson/i.test(o.title) && o.state !== "cancelled").slice(0, 4);

  return (
    <div className="space-y-5">
      <section>
        <SectionTitle>Upcoming lessons</SectionTitle>
        <div className="flex flex-wrap gap-2">
          {upcoming.map((o) => <Badge key={o.key} color="#3B82F6">{DateTime.fromISO(o.start).setZone(tz).toFormat("ccc d LLL")} · {t12(o.start, tz)}{o.status === "needs_reschedule" ? " · flagged" : ""}</Badge>)}
          {sched && upcoming.length === 0 && <p className="text-sm text-muted">No lessons in the next 10 days.</p>}
        </div>
      </section>
      <Card className="space-y-3 p-5">
        <p className="font-semibold">Notes after a lesson</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Lesson date"><Input type="date" max={today} value={form.lesson_date} onChange={(e) => setForm({ ...form, lesson_date: e.target.value })} /></Field>
          <Field label="Attendance"><Select value={form.attended ? "yes" : "no"} onChange={(e) => setForm({ ...form, attended: e.target.value === "yes" })}><option value="yes">Attended</option><option value="no">Missed</option></Select></Field>
        </div>
        <Field label="What we covered"><Textarea value={form.topics} onChange={(e) => setForm({ ...form, topics: e.target.value })} /></Field>
        <Field label="Teacher feedback"><Textarea value={form.teacher_feedback} onChange={(e) => setForm({ ...form, teacher_feedback: e.target.value })} /></Field>
        <Field label="Areas needing improvement" hint="One per line — you can turn these into practice tasks."><Textarea value={form.improvement_areas} onChange={(e) => setForm({ ...form, improvement_areas: e.target.value })} /></Field>
        <Button onClick={async () => { await lessons.create(form); setForm({ ...form, topics: "", teacher_feedback: "", improvement_areas: "", notes: "" }); toast.show("success", "Lesson notes saved."); }}>Save lesson notes</Button>
      </Card>
      <section>
        <SectionTitle>Lesson history</SectionTitle>
        {!lessons.rows ? <Skeleton className="h-24" /> : lessons.rows.length === 0 ? <EmptyState title="No lesson notes yet" /> : (
          <div className="space-y-2">
            {lessons.rows.map((l) => {
              const linked = (tasks.rows ?? []).filter((t) => t.lesson_id === l.id);
              return (
                <Card key={l.id} className="p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{DateTime.fromISO(l.lesson_date).toFormat("cccc d LLL")} {!l.attended && <Badge color="#c2413b">missed</Badge>}</p>
                    <div className="flex gap-1">
                      <Button size="sm" variant="soft" onClick={() => { setConvert(l); setTaskLines(l.improvement_areas ?? l.topics ?? ""); }}><ListTodo className="h-4 w-4" /> To tasks</Button>
                      <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => lessons.remove(l.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  {l.topics && <p className="mt-2 text-sm"><span className="text-muted">Covered:</span> {l.topics}</p>}
                  {l.teacher_feedback && <p className="mt-1 text-sm"><span className="text-muted">Feedback:</span> {l.teacher_feedback}</p>}
                  {l.improvement_areas && <p className="mt-1 text-sm"><span className="text-muted">Improve:</span> {l.improvement_areas}</p>}
                  {linked.length > 0 && <p className="mt-2 text-xs text-muted">{linked.filter((t) => t.done).length}/{linked.length} practice tasks done</p>}
                </Card>
              );
            })}
          </div>
        )}
      </section>
      <Sheet open={!!convert} onClose={() => setConvert(null)} title="Convert notes into practice tasks" footer={
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setConvert(null)}>Cancel</Button>
          <Button onClick={async () => {
            const lines = taskLines.split(/\n|;/).map((s) => s.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
            if (!lines.length) return;
            await tasks.create(lines.map((title) => ({ lesson_id: convert!.id, title, due_date: DateTime.fromISO(today).plus({ days: 7 }).toISODate(), done: false })));
            toast.show("success", `${lines.length} practice task${lines.length > 1 ? "s" : ""} added.`);
            setConvert(null);
          }}>Create tasks</Button></div>
      }>
        <p className="mb-2 text-sm text-muted">One task per line. Edit as you like.</p>
        <Textarea value={taskLines} onChange={(e) => setTaskLines(e.target.value)} className="min-h-[160px]" />
      </Sheet>
    </div>
  );
}

function RepertoireTab() {
  const items = useCollection<Item>("music_items");
  const { today } = useProfile();
  const [add, setAdd] = useState<{ kind: string; name: string; details: string } | null>(null);
  return (
    <div className="space-y-5">
      {KINDS.map(([k, label]) => {
        const list = (items.rows ?? []).filter((i) => i.kind === k);
        return (
          <section key={k}>
            <SectionTitle action={<Button size="sm" variant="ghost" onClick={() => setAdd({ kind: k, name: "", details: "" })}><Plus className="h-4 w-4" /> Add</Button>}>{label}</SectionTitle>
            {list.length === 0 ? <p className="text-sm text-muted">Nothing yet.</p> : (
              <div className="flex flex-wrap gap-2">
                {list.map((i) => (
                  <div key={i.id} className="card flex items-center gap-2 px-3 py-2">
                    <span className="text-sm font-medium">{i.name}</span>
                    {i.details && <span className="text-xs text-muted">{i.details}</span>}
                    <Select className="h-8 w-[118px] py-0 text-xs" value={i.status} onChange={(e) => items.update(i.id, { status: e.target.value, achieved_on: e.target.value === "mastered" ? today : null })}>
                      <option value="learning">Learning</option><option value="practicing">Practising</option><option value="mastered">Mastered</option>
                    </Select>
                    <button aria-label="Delete" onClick={() => items.remove(i.id)}><Trash2 className="h-3.5 w-3.5 text-muted" /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        );
      })}
      <Sheet open={!!add} onClose={() => setAdd(null)} title="Add" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAdd(null)}>Cancel</Button><Button disabled={!add?.name.trim()} onClick={async () => { await items.create({ kind: add!.kind, name: add!.name.trim(), details: add!.details || null, status: add!.kind === "milestone" ? "mastered" : "learning", achieved_on: add!.kind === "milestone" ? today : null }); setAdd(null); }}>Save</Button></div>}>
        {add && <div className="space-y-3"><Field label="Name"><Input value={add.name} onChange={(e) => setAdd({ ...add, name: e.target.value })} placeholder={add.kind === "chord_progression" ? "e.g. ii–V–I in C" : add.kind === "scale" ? "e.g. D major" : ""} /></Field><Field label="Details"><Input value={add.details} onChange={(e) => setAdd({ ...add, details: e.target.value })} /></Field></div>}
      </Sheet>
    </div>
  );
}

function ReportTab() {
  const { today, tz } = useProfile();
  const router = useRouter();
  const toast = useToast();
  const ws = DateTime.fromISO(today).startOf("week");
  const sessions = useCollection<Practice>("keyboard_practice_sessions", `from.practice_date=${ws.minus({ weeks: 7 }).toISODate()}`);
  const { data: sched } = useApi<{ occurrences: OccurrenceView[] }>(`/api/schedule?from=${ws.toISODate()}&to=${ws.endOf("week").toISODate()}`);
  const [busy, setBusy] = useState(false);
  if (!sessions.rows || !sched) return <Skeleton className="h-64" />;
  const thisWeek = sessions.rows.filter((s) => s.practice_date >= ws.toISODate()!);
  const logged = thisWeek.reduce((s, x) => s + x.duration_minutes, 0);
  const practiceOcc = sched.occurrences.filter((o) => /keyboard practice/i.test(o.title) && o.state !== "cancelled");
  const scheduledMin = practiceOcc.reduce((s, o) => s + DateTime.fromISO(o.end).diff(DateTime.fromISO(o.start), "minutes").minutes, 0);
  const completedOccMin = practiceOcc.filter((o) => o.state === "completed").reduce((s, o) => s + (o.completion?.duration_minutes ?? 60), 0);
  const lessons = sched.occurrences.filter((o) => /keyboard lesson/i.test(o.title) && o.state !== "cancelled");
  const byFocus = new Map<string, number>();
  for (const s of thisWeek) byFocus.set(s.focus ?? "Other", (byFocus.get(s.focus ?? "Other") ?? 0) + s.duration_minutes);
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const w = ws.minus({ weeks: 7 - i });
    return { label: w.toFormat("d/M"), value: Math.round(sessions.rows!.filter((s) => s.practice_date >= w.toISODate()! && s.practice_date <= w.endOf("week").toISODate()!).reduce((a, b) => a + b.duration_minutes, 0) / 6) / 10 };
  });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card className="p-4"><p className="text-xs text-muted">Practice logged</p><p className="mt-1 font-display text-2xl font-semibold">{durationLabel(logged + completedOccMin)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Scheduled practice</p><p className="mt-1 font-display text-2xl font-semibold">{durationLabel(scheduledMin)}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Lessons attended</p><p className="mt-1 font-display text-2xl font-semibold">{lessons.filter((l) => l.state === "completed").length}/{lessons.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Sessions</p><p className="mt-1 font-display text-2xl font-semibold">{thisWeek.length + practiceOcc.filter((o) => o.state === "completed").length}</p></Card>
      </div>
      <Card className="p-4"><p className="mb-2 text-sm font-semibold">Hours per week (timer & manual logs)</p><Bars data={weeks} color="#3B82F6" height={130} format={(v) => `${v}h`} /></Card>
      {byFocus.size > 0 && (
        <Card className="p-4"><p className="mb-2 text-sm font-semibold">This week by focus</p>
          <ul className="space-y-1 text-sm">{[...byFocus.entries()].map(([f, m]) => <li key={f} className="flex justify-between"><span>{f}</span><span className="tabular-nums">{durationLabel(m)}</span></li>)}</ul>
        </Card>
      )}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-sm">Want extra practice? I&apos;ll look for free time that respects your rest and sleep.</p>
        <Button loading={busy} onClick={async () => {
          setBusy(true);
          try {
            const res = await api<{ proposal: { id: string } }>("/api/schedule/find-time", { body: { title: "Extra keyboard practice", category_key: "keyboard", duration_minutes: 60, from: today, to: DateTime.fromISO(today).plus({ days: 6 }).toISODate() } });
            router.push(`/proposals/${res.proposal.id}`);
          } catch (e) { toast.show("error", e instanceof Error ? e.message : "Failed"); }
          finally { setBusy(false); }
        }}><CalendarSearch className="h-4 w-4" /> Find time for extra practice</Button>
      </Card>
      <p className={clsx("text-xs text-muted")}>Times shown in {tz}.</p>
    </div>
  );
}
