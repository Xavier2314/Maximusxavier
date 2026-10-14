"use client";
import { useMemo, useState } from "react";
import { DateTime } from "luxon";
import { Dumbbell, Plus, Trash2 } from "lucide-react";
import { Badge, Bars, Button, Card, EmptyState, Field, Input, PageHeader, SectionTitle, Segmented, Select, Sheet, Skeleton, Textarea } from "@/components/ui";
import { ActivitySheet } from "@/components/ActivitySheet";
import { useToast } from "@/components/toast";
import { useApi } from "@/lib/client/api";
import { useCollection, useProfile } from "@/lib/client/hooks";
import { t12 } from "@/lib/client/format";
import type { OccurrenceView } from "@/lib/data";
import type { CategoryRow } from "@/lib/types";

interface Workout { id: string; workout_date: string; workout_type: string; duration_minutes: number | null; energy: number | null; notes: string | null; recovery_notes: string | null }
interface WSet { id: string; workout_id: string; exercise_name: string; set_number: number; reps: number | null; weight_kg: number | null; duration_seconds: number | null; rest_seconds: number | null }
interface Exercise { id: string; name: string; muscle_group: string | null; equipment: string | null; notes: string | null }

const TYPES = ["Strength", "Upper body", "Lower body", "Full body", "Cardio", "HIIT", "Mobility", "Recovery"];

export default function FitnessPage() {
  const { tz, today } = useProfile();
  const toast = useToast();
  const [tab, setTab] = useState<"log" | "history" | "library">("log");
  const from = DateTime.fromISO(today).minus({ weeks: 12 }).toISODate()!;
  const workouts = useCollection<Workout>("gym_workouts", `from.workout_date=${from}&limit=500`);
  const sets = useCollection<WSet>("gym_workout_sets", "limit=1000");
  const library = useCollection<Exercise>("gym_exercises");
  const upcomingTo = DateTime.fromISO(today).plus({ days: 14 }).toISODate()!;
  const { data: sched, mutate: mutateSched } = useApi<{ occurrences: OccurrenceView[]; categories: CategoryRow[] }>(`/api/schedule?from=${today}&to=${upcomingTo}`);
  const [open, setOpen] = useState<OccurrenceView | null>(null);

  const [w, setW] = useState({ workout_date: today, workout_type: "Strength", duration_minutes: "60", energy: "3", notes: "", recovery_notes: "" });
  const [rows, setRows] = useState<{ exercise_name: string; sets: string; reps: string; weight_kg: string; rest_seconds: string }[]>([{ exercise_name: "", sets: "3", reps: "10", weight_kg: "", rest_seconds: "60" }]);
  const [newEx, setNewEx] = useState<{ open: boolean; name: string; muscle_group: string; equipment: string }>({ open: false, name: "", muscle_group: "", equipment: "" });

  const gymSessions = (sched?.occurrences ?? []).filter((o) => o.category?.key === "gym" && /workout/i.test(o.title) && o.state !== "cancelled");
  const weekly = useMemo(() => Array.from({ length: 8 }, (_, i) => {
    const ws = DateTime.fromISO(today).startOf("week").minus({ weeks: 7 - i });
    return { label: ws.toFormat("d/M"), value: (workouts.rows ?? []).filter((x) => x.workout_date >= ws.toISODate()! && x.workout_date <= ws.endOf("week").toISODate()!).length };
  }), [workouts.rows, today]);
  const progressByExercise = useMemo(() => {
    const m = new Map<string, { date: string; max: number }[]>();
    const wDate = new Map((workouts.rows ?? []).map((x) => [x.id, x.workout_date]));
    for (const s of sets.rows ?? []) {
      if (!s.weight_kg || !wDate.has(s.workout_id)) continue;
      const list = m.get(s.exercise_name) ?? [];
      const d = wDate.get(s.workout_id)!;
      const e = list.find((x) => x.date === d);
      if (e) e.max = Math.max(e.max, Number(s.weight_kg)); else list.push({ date: d, max: Number(s.weight_kg) });
      m.set(s.exercise_name, list);
    }
    return [...m.entries()].map(([name, pts]) => ({ name, pts: pts.sort((a, b) => a.date.localeCompare(b.date)) }));
  }, [sets.rows, workouts.rows]);

  async function saveWorkout() {
    try {
      const [created] = await workouts.create({ workout_date: w.workout_date, workout_type: w.workout_type, duration_minutes: Number(w.duration_minutes) || null, energy: Number(w.energy) || null, notes: w.notes || null, recovery_notes: w.recovery_notes || null });
      const newSets = rows.filter((r) => r.exercise_name.trim()).flatMap((r) =>
        Array.from({ length: Math.max(1, Number(r.sets) || 1) }, (_, i) => ({
          workout_id: created.id, exercise_name: r.exercise_name.trim(), set_number: i + 1, reps: Number(r.reps) || null,
          weight_kg: r.weight_kg ? Number(r.weight_kg) : null, rest_seconds: Number(r.rest_seconds) || null,
        })),
      );
      if (newSets.length) await sets.create(newSets);
      toast.show("success", "Workout logged. Great work!");
      setRows([{ exercise_name: "", sets: "3", reps: "10", weight_kg: "", rest_seconds: "60" }]);
      setW({ ...w, notes: "", recovery_notes: "" });
    } catch (e) {
      toast.show("error", e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Fitness" subtitle="Gym on Monday, Wednesday, Friday & Saturday. Recovery on the other days." />

      <section>
        <SectionTitle>Upcoming gym sessions</SectionTitle>
        {!sched ? <Skeleton className="h-20" /> : gymSessions.length === 0 ? <EmptyState title="No gym sessions in the next two weeks" /> : (
          <div className="scroll-hide flex gap-2 overflow-x-auto pb-1">
            {gymSessions.map((o) => (
              <button key={o.key} onClick={() => setOpen(o)} className="card shrink-0 px-4 py-3 text-left">
                <p className="text-sm font-semibold">{DateTime.fromISO(o.start).setZone(tz).toFormat("ccc d LLL")}</p>
                <p className="text-xs text-muted">{t12(o.start, tz)}</p>
                {o.state === "completed" && <Badge color="#22A06B">done</Badge>}
                {o.modified && <Badge color="#8b7fd6">moved</Badge>}
              </button>
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-3 md:grid-cols-2">
        <Card className="p-4"><p className="mb-2 text-sm font-semibold">Consistency (workouts per week)</p><Bars data={weekly} max={Math.max(4, ...weekly.map((x) => x.value))} color="#22A06B" height={120} /></Card>
        <Card className="p-4">
          <p className="mb-2 text-sm font-semibold">Strength progress (heaviest set, kg)</p>
          {progressByExercise.length === 0 ? <p className="text-sm text-muted">Log sets with weights to see trends.</p> : (
            <ul className="space-y-1.5 text-sm">
              {progressByExercise.slice(0, 6).map((e) => {
                const first = e.pts[0].max; const last = e.pts[e.pts.length - 1].max;
                return <li key={e.name} className="flex justify-between"><span>{e.name}</span><span className="tabular-nums">{first} → <strong>{last}</strong> kg {last > first && <span className="text-sage">▲</span>}</span></li>;
              })}
            </ul>
          )}
        </Card>
      </div>

      <Segmented value={tab} onChange={setTab} options={[{ value: "log", label: "Log workout" }, { value: "history", label: "History" }, { value: "library", label: "Exercise library" }]} />

      {tab === "log" && (
        <Card className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Field label="Date"><Input type="date" value={w.workout_date} max={today} onChange={(e) => setW({ ...w, workout_date: e.target.value })} /></Field>
            <Field label="Workout type"><Select value={w.workout_type} onChange={(e) => setW({ ...w, workout_type: e.target.value })}>{TYPES.map((t) => <option key={t}>{t}</option>)}</Select></Field>
            <Field label="Duration (min)"><Input type="number" min={0} value={w.duration_minutes} onChange={(e) => setW({ ...w, duration_minutes: e.target.value })} /></Field>
            <Field label="Energy (1–5)"><Select value={w.energy} onChange={(e) => setW({ ...w, energy: e.target.value })}>{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</Select></Field>
          </div>
          <div>
            <p className="mb-2 text-[13px] font-medium text-ink-2">Exercises</p>
            <datalist id="exercises">{library.rows?.map((x) => <option key={x.id} value={x.name} />)}</datalist>
            <div className="space-y-2">
              {rows.map((r, i) => (
                <div key={i} className="grid grid-cols-[1fr_repeat(4,64px)_36px] items-end gap-1.5">
                  <Input list="exercises" placeholder="Exercise" value={r.exercise_name} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, exercise_name: e.target.value } : x)))} />
                  <Input aria-label="Sets" title="Sets" type="number" min={1} value={r.sets} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, sets: e.target.value } : x)))} />
                  <Input aria-label="Reps" title="Reps" type="number" min={0} value={r.reps} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, reps: e.target.value } : x)))} />
                  <Input aria-label="Weight kg" title="kg" type="number" min={0} step={0.5} placeholder="kg" value={r.weight_kg} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, weight_kg: e.target.value } : x)))} />
                  <Input aria-label="Rest seconds" title="Rest (s)" type="number" min={0} value={r.rest_seconds} onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, rest_seconds: e.target.value } : x)))} />
                  <Button size="icon" variant="ghost" aria-label="Remove" onClick={() => setRows(rows.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <p className="text-[11px] text-muted">Columns: sets · reps · kg · rest (s)</p>
              <Button size="sm" variant="secondary" onClick={() => setRows([...rows, { exercise_name: "", sets: "3", reps: "10", weight_kg: "", rest_seconds: "60" }])}><Plus className="h-4 w-4" /> Add exercise</Button>
            </div>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Workout notes"><Textarea value={w.notes} onChange={(e) => setW({ ...w, notes: e.target.value })} /></Field>
            <Field label="Recovery notes (soreness, sleep, how you feel)"><Textarea value={w.recovery_notes} onChange={(e) => setW({ ...w, recovery_notes: e.target.value })} /></Field>
          </div>
          <Button onClick={saveWorkout}><Dumbbell className="h-4 w-4" /> Save workout</Button>
          <p className="text-xs text-muted">MY RHYTHM tracks what you log; it doesn&apos;t prescribe training or give medical advice. If something hurts, rest and consult a qualified professional.</p>
        </Card>
      )}

      {tab === "history" && (
        !workouts.rows ? <Skeleton className="h-40" /> : workouts.rows.length === 0 ? <EmptyState title="No workouts logged yet" /> : (
          <div className="space-y-2">
            {workouts.rows.map((x) => {
              const ss = (sets.rows ?? []).filter((s) => s.workout_id === x.id);
              const byEx = [...new Set(ss.map((s) => s.exercise_name))];
              return (
                <Card key={x.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-semibold">{x.workout_type} <span className="font-normal text-muted">· {DateTime.fromISO(x.workout_date).toFormat("ccc d LLL")}</span></p>
                      <p className="text-xs text-muted">{x.duration_minutes ? `${x.duration_minutes} min` : ""}{x.energy ? ` · energy ${x.energy}/5` : ""}</p></div>
                    <Button size="icon" variant="ghost" aria-label="Delete workout" onClick={() => workouts.remove(x.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                  {byEx.length > 0 && <ul className="mt-2 text-sm">{byEx.map((name) => { const s = ss.filter((y) => y.exercise_name === name); return <li key={name}>{name}: {s.length}×{s[0].reps ?? "—"}{s[0].weight_kg ? ` @ ${s[0].weight_kg} kg` : ""}</li>; })}</ul>}
                  {x.notes && <p className="mt-1 text-sm text-ink-2">{x.notes}</p>}
                  {x.recovery_notes && <p className="mt-1 text-sm text-muted">Recovery: {x.recovery_notes}</p>}
                </Card>
              );
            })}
          </div>
        )
      )}

      {tab === "library" && (
        <div className="space-y-3">
          <Button size="sm" onClick={() => setNewEx({ ...newEx, open: true })}><Plus className="h-4 w-4" /> Add exercise</Button>
          {!library.rows ? <Skeleton className="h-24" /> : library.rows.length === 0 ? <EmptyState title="Your exercise library is empty" body="Add the exercises in your programme so logging is quick." /> : (
            <Card className="divide-y divide-line">
              {library.rows.map((x) => (
                <div key={x.id} className="flex items-center justify-between p-3">
                  <div><p className="font-medium">{x.name}</p><p className="text-xs text-muted">{[x.muscle_group, x.equipment].filter(Boolean).join(" · ")}</p></div>
                  <Button size="icon" variant="ghost" aria-label="Delete" onClick={() => library.remove(x.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </Card>
          )}
        </div>
      )}

      <Sheet open={newEx.open} onClose={() => setNewEx({ ...newEx, open: false })} title="New exercise" footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setNewEx({ ...newEx, open: false })}>Cancel</Button><Button disabled={!newEx.name.trim()} onClick={async () => { try { await library.create({ name: newEx.name.trim(), muscle_group: newEx.muscle_group || null, equipment: newEx.equipment || null }); setNewEx({ open: false, name: "", muscle_group: "", equipment: "" }); } catch (e) { toast.show("error", e instanceof Error ? e.message : "Failed"); } }}>Save</Button></div>}>
        <div className="space-y-3">
          <Field label="Name"><Input value={newEx.name} onChange={(e) => setNewEx({ ...newEx, name: e.target.value })} placeholder="e.g. Bench press" /></Field>
          <Field label="Muscle group"><Input value={newEx.muscle_group} onChange={(e) => setNewEx({ ...newEx, muscle_group: e.target.value })} /></Field>
          <Field label="Equipment"><Input value={newEx.equipment} onChange={(e) => setNewEx({ ...newEx, equipment: e.target.value })} /></Field>
        </div>
      </Sheet>

      <ActivitySheet occ={open} tz={tz} categories={sched?.categories ?? []} onClose={() => setOpen(null)} onChanged={() => mutateSched()} />
    </div>
  );
}
