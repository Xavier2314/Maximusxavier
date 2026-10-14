"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DateTime } from "luxon";
import { CalendarSearch, Check, Mic, Plus, Trash2 } from "lucide-react";
import { Badge, Button, Card, EmptyState, Field, Input, PageHeader, SectionTitle, Segmented, Select, Sheet, Skeleton, Textarea, clsx } from "@/components/ui";
import { useToast } from "@/components/toast";
import { api } from "@/lib/client/api";
import { useCollection, useProfile } from "@/lib/client/hooks";

interface Stage { id: string; name: string; position: number }
interface Episode {
  id: string; title: string; stage: string; idea: string | null; research_notes: string | null; outline: string | null; script: string | null;
  recording_checklist: { id: string; text: string; done?: boolean }[]; editing_checklist: { id: string; text: string; done?: boolean }[];
  deadline: string | null; publish_date: string | null; published_at: string | null; updated_at: string;
}
interface PTask { id: string; episode_id: string; title: string; due_date: string | null; done: boolean }

const REC = ["Quiet room / sound check", "Mic levels tested", "Script or outline ready", "Water nearby", "Phone on Do Not Disturb", "Backup recording running"];
const EDIT = ["Trim silences & mistakes", "Normalise loudness", "Intro & outro music", "Show notes written", "Cover art ready", "Export & upload"];
const mk = (list: string[]) => list.map((text, i) => ({ id: `c${i}`, text, done: false }));

export default function PodcastPage() {
  const { today } = useProfile();
  const router = useRouter();
  const toast = useToast();
  const stages = useCollection<Stage>("podcast_stages");
  const episodes = useCollection<Episode>("podcast_episodes", "limit=500");
  const tasks = useCollection<PTask>("podcast_tasks", "limit=1000");
  const [open, setOpen] = useState<Episode | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newStage, setNewStage] = useState("");
  const [view, setView] = useState<"board" | "calendar">("board");

  if (!stages.rows || !episodes.rows) return <Skeleton className="h-96" />;
  const stageNames = stages.rows.map((s) => s.name);
  const published = episodes.rows.filter((e) => e.stage === "Published").length;
  const inProgress = episodes.rows.length - published - episodes.rows.filter((e) => e.stage === "Idea").length;

  async function findTime(kind: "Recording" | "Editing", ep?: Episode) {
    try {
      const res = await api<{ proposal: { id: string } }>("/api/schedule/find-time", {
        body: { title: `Podcast ${kind.toLowerCase()}${ep ? `: ${ep.title}` : ""}`, category_key: "podcast", duration_minutes: kind === "Recording" ? 120 : 90, from: today, to: DateTime.fromISO(today).plus({ days: 7 }).toISODate() },
      });
      router.push(`/proposals/${res.proposal.id}`);
    } catch (e) {
      toast.show("error", e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Podcast studio" subtitle="Ideas → research → script → record → edit → publish." />
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-4"><p className="text-xs text-muted">Ideas</p><p className="mt-1 font-display text-2xl font-semibold">{episodes.rows.filter((e) => e.stage === "Idea").length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">In production</p><p className="mt-1 font-display text-2xl font-semibold">{inProgress}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted">Published</p><p className="mt-1 font-display text-2xl font-semibold">{published}</p></Card>
      </div>

      <Card className="flex flex-wrap gap-2 p-4">
        <Input className="min-w-[200px] flex-1" placeholder="Capture an episode idea…" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={async (e) => { if (e.key === "Enter" && newTitle.trim()) { await episodes.create({ title: newTitle.trim(), stage: "Idea", recording_checklist: mk(REC), editing_checklist: mk(EDIT) }); setNewTitle(""); } }} />
        <Button disabled={!newTitle.trim()} onClick={async () => { await episodes.create({ title: newTitle.trim(), stage: "Idea", recording_checklist: mk(REC), editing_checklist: mk(EDIT) }); setNewTitle(""); }}><Plus className="h-4 w-4" /> Add idea</Button>
        <Button variant="soft" onClick={() => findTime("Recording")}><CalendarSearch className="h-4 w-4" /> Find recording time</Button>
      </Card>

      <Segmented value={view} onChange={setView} options={[{ value: "board", label: "Board" }, { value: "calendar", label: "Production calendar" }]} />

      {view === "board" ? (
        <div className="scroll-hide -mx-4 flex gap-3 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
          {stageNames.map((st) => {
            const list = episodes.rows!.filter((e) => e.stage === st);
            return (
              <div key={st} className="w-64 shrink-0">
                <p className="mb-2 flex items-center justify-between text-sm font-semibold">{st}<Badge>{list.length}</Badge></p>
                <div className="space-y-2">
                  {list.map((e) => (
                    <button key={e.id} onClick={() => setOpen(e)} className="card block w-full p-3 text-left">
                      <p className="font-medium">{e.title}</p>
                      <p className="mt-1 text-xs text-muted">{e.deadline ? `Due ${DateTime.fromISO(e.deadline).toFormat("d LLL")}` : "No deadline"}{e.publish_date ? ` · publish ${DateTime.fromISO(e.publish_date).toFormat("d LLL")}` : ""}</p>
                      {e.deadline && e.deadline < today && e.stage !== "Published" && <Badge color="#c2413b">overdue</Badge>}
                    </button>
                  ))}
                  {list.length === 0 && <div className="rounded-2xl border border-dashed border-line p-4 text-center text-xs text-muted">Empty</div>}
                </div>
              </div>
            );
          })}
          <div className="w-56 shrink-0">
            <p className="mb-2 text-sm font-semibold text-muted">Add a stage</p>
            <Input value={newStage} placeholder="Custom stage" onChange={(e) => setNewStage(e.target.value)} />
            <Button size="sm" className="mt-2" variant="secondary" disabled={!newStage.trim()} onClick={async () => { await stages.create({ name: newStage.trim(), position: (stages.rows!.at(-2)?.position ?? 0) + 1 }); setNewStage(""); }}>Add</Button>
          </div>
        </div>
      ) : (
        <ProductionCalendar episodes={episodes.rows} tasks={tasks.rows ?? []} onOpen={setOpen} />
      )}

      <EpisodeSheet
        ep={open}
        stages={stageNames}
        tasks={(tasks.rows ?? []).filter((t) => t.episode_id === open?.id)}
        onClose={() => setOpen(null)}
        onSave={async (patch) => { await episodes.update(open!.id, patch); setOpen({ ...open!, ...patch }); }}
        onDelete={async () => { await episodes.remove(open!.id); setOpen(null); }}
        onAddTask={(t) => tasks.create({ episode_id: open!.id, ...t })}
        onToggleTask={(t) => tasks.update(t.id, { done: !t.done })}
        onDeleteTask={(t) => tasks.remove(t.id)}
        onFindTime={(k) => findTime(k, open!)}
      />
    </div>
  );
}

function ProductionCalendar({ episodes, tasks, onOpen }: { episodes: Episode[]; tasks: PTask[]; onOpen: (e: Episode) => void }) {
  const items = [
    ...episodes.filter((e) => e.deadline).map((e) => ({ date: e.deadline!, label: `Deadline: ${e.title}`, e })),
    ...episodes.filter((e) => e.publish_date).map((e) => ({ date: e.publish_date!, label: `Publish: ${e.title}`, e })),
    ...tasks.filter((t) => t.due_date && !t.done).map((t) => ({ date: t.due_date!, label: t.title, e: episodes.find((e) => e.id === t.episode_id)! })),
  ].filter((x) => x.e).sort((a, b) => a.date.localeCompare(b.date));
  if (!items.length) return <EmptyState icon={<Mic className="h-8 w-8" />} title="Nothing on the production calendar" body="Add deadlines, publish dates or tasks to episodes." />;
  return (
    <Card className="divide-y divide-line">
      {items.map((x, i) => (
        <button key={i} onClick={() => onOpen(x.e)} className="flex w-full items-center gap-3 p-3 text-left text-sm">
          <span className="w-24 shrink-0 text-muted">{DateTime.fromISO(x.date).toFormat("ccc d LLL")}</span><span className="flex-1">{x.label}</span><Badge>{x.e.stage}</Badge>
        </button>
      ))}
    </Card>
  );
}

function EpisodeSheet({ ep, stages, tasks, onClose, onSave, onDelete, onAddTask, onToggleTask, onDeleteTask, onFindTime }: {
  ep: Episode | null; stages: string[]; tasks: PTask[]; onClose: () => void; onSave: (p: Partial<Episode>) => Promise<void>; onDelete: () => void;
  onAddTask: (t: { title: string; due_date: string | null; done: boolean }) => void; onToggleTask: (t: PTask) => void; onDeleteTask: (t: PTask) => void; onFindTime: (k: "Recording" | "Editing") => void;
}) {
  const [tab, setTab] = useState<"overview" | "research" | "outline" | "script" | "checklists">("overview");
  const [draft, setDraft] = useState<Partial<Episode>>({});
  const [task, setTask] = useState({ title: "", due_date: "" });
  const toast = useToast();
  if (!ep) return null;
  const v = { ...ep, ...draft };
  const save = async () => { await onSave(draft); setDraft({}); toast.show("success", "Saved."); };
  const checklist = (key: "recording_checklist" | "editing_checklist", title: string) => (
    <div>
      <p className="mb-2 text-sm font-semibold">{title}</p>
      {v[key].map((c) => (
        <label key={c.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5 hover:bg-surface-2">
          <input type="checkbox" className="h-5 w-5 accent-[var(--sage)]" checked={!!c.done} onChange={() => onSave({ [key]: v[key].map((x) => (x.id === c.id ? { ...x, done: !x.done } : x)) })} />
          <span className={clsx("text-sm", c.done && "text-muted line-through")}>{c.text}</span>
        </label>
      ))}
    </div>
  );
  return (
    <Sheet open={!!ep} onClose={() => { setDraft({}); onClose(); }} wide title={v.title} footer={
      <div className="flex justify-between gap-2"><Button variant="ghost" className="text-danger" onClick={onDelete}><Trash2 className="h-4 w-4" /> Delete</Button><Button onClick={save} disabled={!Object.keys(draft).length}>Save changes</Button></div>
    }>
      <div className="space-y-4">
        <Segmented value={tab} onChange={setTab} options={[{ value: "overview", label: "Overview" }, { value: "research", label: "Research" }, { value: "outline", label: "Outline" }, { value: "script", label: "Script" }, { value: "checklists", label: "Checklists" }]} />
        {tab === "overview" && (
          <div className="space-y-4">
            <Field label="Title"><Input value={v.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Status"><Select value={v.stage} onChange={(e) => setDraft({ ...draft, stage: e.target.value, published_at: e.target.value === "Published" ? new Date().toISOString() : v.published_at })}>{stages.map((s) => <option key={s}>{s}</option>)}</Select></Field>
              <Field label="Deadline"><Input type="date" value={v.deadline ?? ""} onChange={(e) => setDraft({ ...draft, deadline: e.target.value || null })} /></Field>
              <Field label="Publish date"><Input type="date" value={v.publish_date ?? ""} onChange={(e) => setDraft({ ...draft, publish_date: e.target.value || null })} /></Field>
            </div>
            <Field label="Idea"><Textarea value={v.idea ?? ""} onChange={(e) => setDraft({ ...draft, idea: e.target.value })} /></Field>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="soft" onClick={() => onFindTime("Recording")}><CalendarSearch className="h-4 w-4" /> Find time to record</Button>
              <Button size="sm" variant="soft" onClick={() => onFindTime("Editing")}><CalendarSearch className="h-4 w-4" /> Find time to edit</Button>
            </div>
            <SectionTitle>Tasks</SectionTitle>
            <div className="space-y-1">
              {tasks.map((t) => (
                <div key={t.id} className="flex items-center gap-3 rounded-xl px-2 py-1.5">
                  <button aria-label="Toggle" onClick={() => onToggleTask(t)} className={clsx("flex h-6 w-6 items-center justify-center rounded-md border", t.done ? "border-sage bg-sage text-white" : "border-line")}>{t.done && <Check className="h-4 w-4" />}</button>
                  <span className={clsx("flex-1 text-sm", t.done && "text-muted line-through")}>{t.title}</span>
                  {t.due_date && <span className="text-xs text-muted">{DateTime.fromISO(t.due_date).toFormat("d LLL")}</span>}
                  <button aria-label="Delete task" onClick={() => onDeleteTask(t)}><Trash2 className="h-4 w-4 text-muted" /></button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input placeholder="New task" value={task.title} onChange={(e) => setTask({ ...task, title: e.target.value })} />
                <Input type="date" className="w-40" value={task.due_date} onChange={(e) => setTask({ ...task, due_date: e.target.value })} />
                <Button variant="secondary" disabled={!task.title.trim()} onClick={() => { onAddTask({ title: task.title.trim(), due_date: task.due_date || null, done: false }); setTask({ title: "", due_date: "" }); }}><Plus className="h-4 w-4" /></Button>
              </div>
            </div>
          </div>
        )}
        {tab === "research" && <Textarea className="min-h-[50vh]" placeholder="Sources, quotes, facts to verify…" value={v.research_notes ?? ""} onChange={(e) => setDraft({ ...draft, research_notes: e.target.value })} />}
        {tab === "outline" && <Textarea className="min-h-[50vh]" placeholder={"1. Hook\n2. Main point\n3. Story\n4. Takeaway"} value={v.outline ?? ""} onChange={(e) => setDraft({ ...draft, outline: e.target.value })} />}
        {tab === "script" && <Textarea className="min-h-[50vh] font-display text-[16px] leading-relaxed" placeholder="Write your script…" value={v.script ?? ""} onChange={(e) => setDraft({ ...draft, script: e.target.value })} />}
        {tab === "checklists" && <div className="grid gap-4 md:grid-cols-2">{checklist("recording_checklist", "Recording checklist")}{checklist("editing_checklist", "Editing checklist")}</div>}
      </div>
    </Sheet>
  );
}
