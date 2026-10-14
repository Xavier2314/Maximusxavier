"use client";
import { useState } from "react";
import Link from "next/link";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight, Heart, Lightbulb, Sparkles } from "lucide-react";
import { Bars, Button, Card, ErrorState, PageHeader, SectionTitle, Skeleton } from "@/components/ui";
import { useApi } from "@/lib/client/api";
import { useProfile } from "@/lib/client/hooks";
import { durationLabel } from "@/lib/client/format";
import type { CategoryStat } from "@/lib/stats";

interface Weekly {
  week: { from: string; to: string };
  stats: Record<string, CategoryStat>;
  names: Record<string, string>;
  summary: string[];
  habits: { id: string; name: string; color: string; weekCount: number; target_per_week: number; current: number; days: string[] }[];
  missed: { title: string; start: string; key: string }[];
  keyboard: { practiceMinutes: number; lessonsAttended: number; lessonsScheduled: number };
  gym: { sessions: number; logged: number };
  podcast: { episodesTouched: { title: string; stage: string }[] };
  sleep: { nights: number } | null;
  changes: { id: string; title: string; status: string }[];
  recommendations: string[];
}

const COLORS: Record<string, string> = { spiritual: "#8B5CF6", gym: "#22A06B", keyboard: "#3B82F6", office: "#F97316", podcast: "#EC4899", personal: "#6B7280", travel: "#14B8A6", events: "#D4A017" };

export default function ReviewPage() {
  const { tz, today } = useProfile();
  const [week, setWeek] = useState(() => DateTime.now().setZone(tz).toISODate()!);
  const { data, error, mutate } = useApi<Weekly>(`/api/stats/weekly?week=${week}`);
  if (error) return <ErrorState error={error} retry={() => mutate()} />;
  if (!data) return <Skeleton className="h-[70vh]" />;
  const s = data.stats;
  const rate = (k: string) => (s[k]?.rate ?? null);
  const cats = Object.values(s).filter((c) => c.scheduled > 0);
  const isCurrent = data.week.to >= today;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Weekly review"
        subtitle={`${DateTime.fromISO(data.week.from).toFormat("d LLL")} – ${DateTime.fromISO(data.week.to).toFormat("d LLL yyyy")}`}
        action={
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" aria-label="Previous week" onClick={() => setWeek(DateTime.fromISO(data.week.from).minus({ days: 7 }).toISODate()!)}><ChevronLeft className="h-5 w-5" /></Button>
            <Button size="icon" variant="ghost" aria-label="Next week" disabled={isCurrent} onClick={() => setWeek(DateTime.fromISO(data.week.from).plus({ days: 7 }).toISODate()!)}><ChevronRight className="h-5 w-5" /></Button>
          </div>
        }
      />

      <Card className="flex gap-3 bg-gradient-to-br from-lavender-soft to-sage-soft p-5">
        <Heart className="h-5 w-5 shrink-0 text-lavender" />
        <div className="space-y-1.5 text-[15px]">{data.summary.map((l) => <p key={l}>{l}</p>)}</div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Spiritual consistency" value={rate("spiritual") === null ? "—" : `${rate("spiritual")}%`} sub={`${s.spiritual?.completed ?? 0} of ${(s.spiritual?.completed ?? 0) + (s.spiritual?.missed ?? 0) + (s.spiritual?.skipped ?? 0)} devotions`} color={COLORS.spiritual} />
        <Metric label="Gym attendance" value={`${data.gym.sessions}`} sub={`${s.gym?.scheduled ?? 0} scheduled · ${data.gym.logged} workouts logged`} color={COLORS.gym} />
        <Metric label="Keyboard practice" value={durationLabel(data.keyboard.practiceMinutes)} sub={`Lessons ${data.keyboard.lessonsAttended}/${data.keyboard.lessonsScheduled} attended`} color={COLORS.keyboard} />
        <Metric label="Office attendance" value={rate("office") === null ? "—" : `${rate("office")}%`} sub={`${s.office?.completed ?? 0} of ${s.office?.scheduled ?? 0} sessions`} color={COLORS.office} />
      </div>

      <section>
        <SectionTitle>Completion by area</SectionTitle>
        <Card className="p-5">
          {cats.length === 0 ? <p className="text-sm text-muted">No activities this week.</p> : (
            <Bars data={cats.map((c) => ({ label: (data.names[c.key] ?? c.key).slice(0, 8), value: c.rate ?? 0, color: COLORS[c.key] }))} max={100} height={150} format={(v) => `${v}%`} />
          )}
          <p className="mt-3 text-xs text-muted">Percentages = completed ÷ (completed + skipped + missed). Upcoming sessions aren&apos;t counted.</p>
        </Card>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section>
          <SectionTitle>Habits</SectionTitle>
          <Card className="divide-y divide-line">
            {data.habits.map((h) => (
              <div key={h.id} className="flex items-center gap-3 p-3">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: h.color }} />
                <span className="flex-1 text-sm">{h.name}</span>
                <span className="text-sm font-medium tabular-nums">{h.weekCount}/{h.target_per_week}</span>
              </div>
            ))}
          </Card>
          {data.sleep && <p className="mt-2 text-xs text-muted">Sleep consistency: {data.sleep.nights} night{data.sleep.nights === 1 ? "" : "s"} recorded on time.</p>}
        </section>
        <section>
          <SectionTitle>Missed activities ({data.missed.length})</SectionTitle>
          <Card className="max-h-72 divide-y divide-line overflow-y-auto">
            {data.missed.length === 0 ? <p className="p-4 text-sm text-muted">Nothing missed. 🎉</p> : data.missed.map((m) => (
              <div key={m.key} className="flex justify-between gap-3 p-3 text-sm"><span>{m.title}</span><span className="text-muted">{DateTime.fromISO(m.start).setZone(tz).toFormat("ccc h:mm a")}</span></div>
            ))}
          </Card>
          <p className="mt-2 text-xs text-muted">“Missed” = in the past and not marked complete or skipped. If you did it, mark it complete from the calendar.</p>
        </section>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <section>
          <SectionTitle>Podcast progress</SectionTitle>
          <Card className="p-4 text-sm">
            {data.podcast.episodesTouched.length === 0 ? <p className="text-muted">No episode updates this week.</p> : <ul className="space-y-1">{data.podcast.episodesTouched.map((e) => <li key={e.title}>{e.title} — <span className="text-muted">{e.stage}</span></li>)}</ul>}
            <p className="mt-2 text-muted">Podcast sessions: {s.podcast?.completed ?? 0} of {s.podcast?.scheduled ?? 0} completed.</p>
          </Card>
        </section>
        <section>
          <SectionTitle>Schedule changes & conflicts</SectionTitle>
          <Card className="p-4 text-sm">
            {data.changes.length === 0 ? <p className="text-muted">No schedule proposals this week.</p> : <ul className="space-y-1">{data.changes.map((c) => <li key={c.id}><Link href={`/proposals/${c.id}`} className="hover:underline">{c.title}</Link> — <span className="text-muted">{c.status.replace("_", " ")}</span></li>)}</ul>}
          </Card>
        </section>
      </div>

      <section>
        <SectionTitle>Recommendations for next week</SectionTitle>
        <Card className="space-y-2 p-4">
          {data.recommendations.map((r) => <p key={r} className="flex gap-2 text-[15px]"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warn" />{r}</p>)}
          <Link href={`/assistant?q=${encodeURIComponent("Look at my week and help me plan next week. Be gentle and realistic.")}`}>
            <Button variant="soft" className="mt-2"><Sparkles className="h-4 w-4 text-lavender" /> Plan next week with AI</Button>
          </Link>
        </Card>
      </section>
    </div>
  );
}

function Metric({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 font-display text-2xl font-semibold" style={{ color }}>{value}</p>
      <p className="text-xs text-muted">{sub}</p>
    </Card>
  );
}
