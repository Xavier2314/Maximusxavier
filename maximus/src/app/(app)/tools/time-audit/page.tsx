import Link from "next/link";
import { Clock, Timer, Zap } from "lucide-react";
import { TrendBars } from "@/components/charts";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { TASK_CATEGORIES, addDays } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { BLOCK_CATEGORIES, elapsedSeconds, fmtMinutes, type FocusSession } from "@/lib/tools";
import { cn, formatDate, todayIn } from "@/lib/utils";
import { BackToTools } from "../timer-page";

export const metadata = { title: "Time audit" };

const KIND_LABEL: Record<string, string> = { pomodoro: "Pomodoro", deep_work: "Deep work", stopwatch: "Stopwatch", countdown: "Countdown", focus: "Focus mode" };

export default async function TimeAuditPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const viewer = await requireViewer();
  const { days: rawDays } = await searchParams;
  const days = rawDays === "30" ? 30 : 7;
  const tz = viewer.profile.timezone;
  const today = todayIn(tz);
  const from = addDays(today, -(days - 1));
  const supabase = await createClient();
  const [{ data: sessions }, { data: blocks }, { data: tasks }] = await Promise.all([
    supabase.from("focus_sessions").select("*").eq("user_id", viewer.id).eq("status", "completed").neq("kind", "break")
      .gte("started_at", `${from}T00:00:00`).order("started_at").returns<FocusSession[]>(),
    supabase.from("time_blocks").select("category, start_min, end_min, done").eq("user_id", viewer.id).gte("block_date", from).lte("block_date", today),
    supabase.from("tasks").select("category, completed_at").eq("user_id", viewer.id).gte("completed_at", `${from}T00:00:00`),
  ]);
  const dayOf = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
  const list = sessions ?? [];
  const mins = (s: FocusSession) => elapsedSeconds(s) / 60;
  const totalMin = list.reduce((a, s) => a + mins(s), 0);
  const interruptions = list.reduce((a, s) => a + s.interruptions, 0);
  const chart = Array.from({ length: days }, (_, i) => {
    const d = addDays(from, i);
    return { day: formatDate(d, days === 7 ? { weekday: "short" } : { day: "numeric", month: "short" }), minutes: Math.round(list.filter((s) => dayOf(s.started_at) === d).reduce((a, s) => a + mins(s), 0)) };
  });
  const byKind = Object.entries(list.reduce<Record<string, number>>((acc, s) => { acc[s.kind] = (acc[s.kind] ?? 0) + mins(s); return acc; }, {})).sort((a, b) => b[1] - a[1]);
  const byLabel = Object.entries(list.reduce<Record<string, number>>((acc, s) => { const k = s.label?.trim() || "Unlabelled"; acc[k] = (acc[k] ?? 0) + mins(s); return acc; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const blockCats = BLOCK_CATEGORIES.map((c) => {
    const bs = (blocks ?? []).filter((b) => b.category === c.key);
    return { ...c, planned: bs.reduce((a, b) => a + b.end_min - b.start_min, 0), done: bs.filter((b) => b.done).reduce((a, b) => a + b.end_min - b.start_min, 0) };
  }).filter((c) => c.planned > 0);
  const taskCats = TASK_CATEGORIES.map((c) => ({ ...c, n: (tasks ?? []).filter((t) => t.category === c.key).length })).filter((c) => c.n > 0);
  const best = chart.reduce((a, b) => (b.minutes > a.minutes ? b : a), chart[0]);
  const deep = list.filter((s) => s.kind === "deep_work");
  const deepPlanned = deep.reduce((a, s) => a + (s.planned_seconds ?? 0) / 60, 0);
  const deepActual = deep.reduce((a, s) => a + mins(s), 0);

  return (
    <>
      <PageHeader eyebrow="Focus & time" title="Time audit" description="Where your focused time actually went. Only completed timer sessions count." action={<BackToTools c="focus" />} />
      <div className="mb-4 flex gap-2">
        {[7, 30].map((n) => (
          <Link key={n} href={`/tools/time-audit?days=${n}`} className={cn("rounded-full px-3 py-1 text-sm", days === n ? "bg-primary text-primary-fg" : "bg-surface-muted")}>Last {n} days</Link>
        ))}
      </div>
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Focused time" value={fmtMinutes(totalMin)} icon={<Clock className="size-5" aria-hidden />} />
        <StatCard label="Sessions" value={list.length} icon={<Timer className="size-5" aria-hidden />} tone="green" />
        <StatCard label="Daily average" value={fmtMinutes(totalMin / days)} icon={<Clock className="size-5" aria-hidden />} tone="lime" />
        <StatCard label="Interruptions" value={interruptions} hint={list.length ? `${(interruptions / list.length).toFixed(1)} per session` : undefined} icon={<Zap className="size-5" aria-hidden />} tone="navy" />
      </div>
      {list.length === 0 ? (
        <Card><EmptyState icon={<Timer className="size-6" aria-hidden />} title="No focus sessions yet"
          description="Run a Pomodoro or deep work session and your time will show up here."
          action={<Link href="/tools/pomodoro" className="text-primary">Start a Pomodoro</Link>} /></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Focused minutes per day" description={best && best.minutes > 0 ? `Best day: ${best.day} (${fmtMinutes(best.minutes)})` : undefined} />
            <CardBody><TrendBars data={chart} xKey="day" series={[{ key: "minutes", label: "Minutes" }]} caption="Focused minutes per day" /></CardBody>
          </Card>
          <Card>
            <CardHeader title="By timer" />
            <CardBody className="space-y-2 text-sm">
              {byKind.map(([k, m]) => <Row key={k} label={KIND_LABEL[k] ?? k} value={fmtMinutes(m)} pct={(m / totalMin) * 100} />)}
              {deep.length > 0 && <p className="pt-2 text-xs text-fg-muted">Deep work: planned {fmtMinutes(deepPlanned)}, actual {fmtMinutes(deepActual)}.</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="What you worked on" description="From the timer labels." />
            <CardBody className="space-y-2 text-sm">
              {byLabel.map(([k, m]) => <Row key={k} label={k} value={fmtMinutes(m)} pct={(m / totalMin) * 100} />)}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Time blocks" description="Planned vs ticked done." />
            <CardBody className="space-y-2 text-sm">
              {blockCats.length === 0 ? <p className="text-fg-muted">No time blocks in this period.</p> : blockCats.map((c) => (
                <Row key={c.key} label={c.label} value={`${fmtMinutes(c.done)} / ${fmtMinutes(c.planned)}`} pct={(c.done / c.planned) * 100} color={c.color} />
              ))}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Tasks completed" />
            <CardBody className="space-y-2 text-sm">
              {taskCats.length === 0 ? <p className="text-fg-muted">No tasks completed in this period.</p> : taskCats.map((c) => (
                <p key={c.key} className="flex justify-between"><span>{c.label}</span><span className="tabular-nums font-medium">{c.n}</span></p>
              ))}
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}

function Row({ label, value, pct, color }: { label: string; value: string; pct: number; color?: string }) {
  return (
    <div>
      <p className="flex justify-between gap-2"><span className="truncate">{label}</span><span className="shrink-0 tabular-nums text-fg-muted">{value}</span></p>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, pct)}%`, background: color ?? "var(--primary)" }} />
      </div>
    </div>
  );
}
