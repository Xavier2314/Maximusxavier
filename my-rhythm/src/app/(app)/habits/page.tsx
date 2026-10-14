"use client";
import { useState } from "react";
import { DateTime } from "luxon";
import { Check, Flame, Plus, Trash2 } from "lucide-react";
import { Bars, Button, Card, ErrorState, Field, Input, PageHeader, Select, Sheet, Skeleton, clsx } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { useToast } from "@/components/toast";
import { api } from "@/lib/client/api";
import { useCollection, useProfile } from "@/lib/client/hooks";
import { streaks } from "@/lib/stats";

interface Habit { id: string; name: string; icon: string; color: string; target_per_week: number; active: boolean; position: number }
interface HC { id: string; habit_id: string; completed_on: string; minutes: number | null }

export default function HabitsPage() {
  const { tz, today } = useProfile();
  const toast = useToast();
  const habits = useCollection<Habit>("habits", "f.active=true");
  const from = DateTime.fromISO(today).minus({ days: 120 }).toISODate()!;
  const comps = useCollection<HC>("habit_completions", `from.completed_on=${from}&limit=1000`);
  const [adding, setAdding] = useState(false);
  const [nh, setNh] = useState({ name: "", target_per_week: 7, color: "#2563eb" });
  const week = Array.from({ length: 7 }, (_, i) => DateTime.fromISO(today).startOf("week").plus({ days: i }));

  if (habits.error) return <ErrorState error={habits.error} />;
  if (!habits.rows || !comps.rows) return <Skeleton className="h-96" />;

  async function toggle(h: Habit, date: string, done: boolean) {
    try {
      await api("/api/habits/toggle", { body: { habitId: h.id, date, done } });
      comps.mutate();
    } catch (e) {
      toast.show("error", e instanceof Error ? e.message : "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Habits" subtitle="Tracked only from what you actually record — nothing is assumed." action={<Button size="sm" onClick={() => setAdding(true)}><Plus className="h-4 w-4" /> New habit</Button>} />
      <div className="space-y-3">
        {habits.rows.map((h) => {
          const dates = comps.rows!.filter((c) => c.habit_id === h.id).map((c) => c.completed_on);
          const st = streaks(dates, today);
          const monthDays = DateTime.fromISO(today).day;
          const weeks = Array.from({ length: 8 }, (_, i) => {
            const ws = DateTime.fromISO(today).startOf("week").minus({ weeks: 7 - i });
            const n = dates.filter((d) => d >= ws.toISODate()! && d <= ws.endOf("week").toISODate()!).length;
            return { label: ws.toFormat("d/M"), value: n, color: n >= h.target_per_week ? "var(--sage)" : h.color };
          });
          return (
            <Card key={h.id} className="p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${h.color}22`, color: h.color }}><CategoryIcon icon={h.icon} /></span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{h.name}</p>
                  <p className="text-xs text-muted">Goal {h.target_per_week}×/week · this week {st.thisWeek}/{h.target_per_week} · month {st.thisMonth}/{monthDays} days ({Math.round((st.thisMonth / monthDays) * 100)}%)</p>
                </div>
                <div className="text-right">
                  <p className="flex items-center justify-end gap-1 font-display text-2xl font-semibold"><Flame className={clsx("h-5 w-5", st.current ? "text-warn" : "text-muted")} />{st.current}</p>
                  <p className="text-[11px] text-muted">best {st.longest}</p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-7 gap-1.5">
                {week.map((d) => {
                  const iso = d.toISODate()!;
                  const done = dates.includes(iso);
                  const future = iso > today;
                  return (
                    <button key={iso} disabled={future} onClick={() => toggle(h, iso, !done)} aria-pressed={done} aria-label={`${h.name} ${d.toFormat("cccc")}`}
                      className={clsx("flex flex-col items-center rounded-xl py-1.5 text-xs transition disabled:opacity-40", done ? "text-white" : "bg-surface-2 text-ink-2", iso === today && !done && "ring-2 ring-lavender/50")}
                      style={done ? { backgroundColor: h.color } : undefined}>
                      <span>{d.toFormat("ccc")}</span>
                      {done ? <Check className="mt-0.5 h-4 w-4" /> : <span className="mt-0.5 font-semibold">{d.day}</span>}
                    </button>
                  );
                })}
              </div>
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-muted">Last 8 weeks</summary>
                <div className="mt-2"><Bars data={weeks} max={7} height={110} /></div>
                <Button size="sm" variant="ghost" className="mt-2 text-danger" onClick={async () => { await habits.update(h.id, { active: false }); toast.show("info", `“${h.name}” archived.`); }}><Trash2 className="h-4 w-4" /> Archive habit</Button>
              </details>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-muted">Habits linked to calendar activities (devotion, gym, keyboard, office, podcast) are recorded automatically when you tap <strong>Complete</strong> on that activity. Times are in {tz}.</p>

      <Sheet open={adding} onClose={() => setAdding(false)} title="New habit" footer={
        <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setAdding(false)}>Cancel</Button>
          <Button onClick={async () => { if (!nh.name.trim()) return; await habits.create({ ...nh, icon: "sparkles", position: habits.rows!.length, active: true }); setAdding(false); setNh({ name: "", target_per_week: 7, color: "#2563eb" }); }}>Create</Button></div>
      }>
        <div className="space-y-4">
          <Field label="Name"><Input value={nh.name} onChange={(e) => setNh({ ...nh, name: e.target.value })} placeholder="e.g. Read 10 pages" /></Field>
          <Field label="Target days per week"><Select value={nh.target_per_week} onChange={(e) => setNh({ ...nh, target_per_week: Number(e.target.value) })}>{[1, 2, 3, 4, 5, 6, 7].map((n) => <option key={n}>{n}</option>)}</Select></Field>
          <Field label="Colour"><input type="color" value={nh.color} onChange={(e) => setNh({ ...nh, color: e.target.value })} className="h-11 w-full rounded-xl border border-line" /></Field>
        </div>
      </Sheet>
    </div>
  );
}
