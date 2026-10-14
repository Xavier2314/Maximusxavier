"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DateTime } from "luxon";
import { BellRing, Check, ChevronRight, Flag, Flame, Plus, Sparkles, Timer, TriangleAlert } from "lucide-react";
import { Badge, Button, Card, EmptyState, ErrorState, ProgressRing, SectionTitle, Skeleton, clsx } from "@/components/ui";
import { CategoryIcon } from "@/components/CategoryIcon";
import { ActivitySheet } from "@/components/ActivitySheet";
import { useApi } from "@/lib/client/api";
import { useNow } from "@/lib/client/useNow";
import { countdown, dayLabel, t12, t12s } from "@/lib/client/format";
import type { OccurrenceView } from "@/lib/data";
import type { CategoryRow, Profile } from "@/lib/types";

interface Dashboard {
  now: string;
  timezone: string;
  profile: Profile;
  motivation: string;
  today: OccurrenceView[];
  current: OccurrenceView | null;
  next: OccurrenceView | null;
  progress: { done: number; total: number; percent: number };
  week: { done: number; due: number; percent: number | null };
  upcoming: OccurrenceView[];
  flagged: OccurrenceView[];
  habits: { id: string; name: string; icon: string; color: string; current: number; doneToday: boolean; thisWeek: number; target_per_week: number }[];
  reminders: { id: string; title: string; body: string; fire_at: string; kind: string }[];
  devices: number;
  categories: CategoryRow[];
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const { data, error, mutate, isLoading } = useApi<Dashboard>("/api/dashboard", { refreshInterval: 60_000 });
  const [open, setOpen] = useState<OccurrenceView | null>(null);
  const params = useSearchParams();
  const now = useNow(1000);

  useEffect(() => {
    const focus = params.get("focus");
    if (focus && data) {
      const o = [...data.today, ...data.upcoming].find((x) => x.key === focus);
      if (o) setOpen(o);
    }
  }, [params, data]);

  const tz = data?.timezone ?? "Africa/Lagos";
  const nowDt = DateTime.fromMillis(now).setZone(tz);
  const greeting = nowDt.hour < 12 ? "Good morning" : nowDt.hour < 17 ? "Good afternoon" : "Good evening";

  // live current/next from the timeline (recomputed every second)
  const { current, next } = useMemo(() => {
    if (!data) return { current: null, next: null };
    const live = data.today.filter((o) => o.state !== "cancelled" && !o.allDay);
    const cur = live.find((o) => DateTime.fromISO(o.start).toMillis() <= now && DateTime.fromISO(o.end).toMillis() > now && o.state !== "completed" && o.state !== "skipped") ?? null;
    const nx = live.find((o) => DateTime.fromISO(o.start).toMillis() > now) ?? data.next;
    return { current: cur, next: nx };
  }, [data, now]);

  if (error) return <ErrorState error={error} retry={() => mutate()} />;
  if (isLoading || !data) return <DashboardSkeleton />;

  const completed = data.today.filter((o) => o.state === "completed");
  const missed = data.today.filter((o) => o.state === "missed");
  const name = data.profile.display_name?.split(" ")[0];

  return (
    <div className="space-y-6">
      <header className="animate-fade-up">
        <p className="text-sm font-medium text-muted">{nowDt.toFormat("cccc, d LLLL yyyy")} · <span className="tabular-nums">{nowDt.toFormat("h:mm:ss a")}</span></p>
        <h1 className="mt-1 font-display text-[30px] leading-tight font-semibold tracking-tight md:text-[38px]">{greeting}{name ? `, ${name}` : ""}.</h1>
        <p className="mt-1 text-[15px] text-ink-2 italic">{data.motivation}</p>
      </header>

      {data.devices === 0 && (
        <Link href="/reminders" className="flex items-center gap-3 rounded-2xl border border-lavender/40 bg-lavender-soft p-4">
          <BellRing className="h-5 w-5 shrink-0 text-lavender" />
          <span className="flex-1 text-sm"><span className="font-semibold">Turn on phone reminders.</span> No device is registered yet — set up notifications on your iPhone.</span>
          <ChevronRight className="h-5 w-5 text-muted" />
        </Link>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Now / Next */}
        <Card className="relative overflow-hidden p-5 md:col-span-2">
          <div className="absolute inset-0 -z-0 bg-gradient-to-br from-lavender-soft/70 via-transparent to-sage-soft/60" />
          <div className="relative grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Now</p>
              {current ? (
                <button onClick={() => setOpen(current)} className="mt-2 text-left">
                  <p className="text-xl font-semibold">{current.title}</p>
                  <p className="text-sm text-muted">{t12(current.start, tz)} – {t12(current.end, tz)}</p>
                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-line">
                    <div className="h-full rounded-full bg-sage transition-all" style={{ width: `${Math.min(100, ((now - DateTime.fromISO(current.start).toMillis()) / (DateTime.fromISO(current.end).toMillis() - DateTime.fromISO(current.start).toMillis())) * 100)}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-muted">{countdown(DateTime.fromISO(current.end).toMillis() - now)} left{current.state === "in_progress" && " · timer running"}</p>
                </button>
              ) : (
                <p className="mt-2 text-ink-2">Free time. Breathe, rest, or get ahead.</p>
              )}
            </div>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">Next</p>
              {next ? (
                <button onClick={() => setOpen(next)} className="mt-2 text-left">
                  <p className="text-xl font-semibold">{next.title}</p>
                  <p className="text-sm text-muted">{DateTime.fromISO(next.start).setZone(tz).hasSame(nowDt, "day") ? "" : `${dayLabel(next.start, tz, "cccc")} · `}{t12(next.start, tz)}</p>
                  <p className="mt-3 font-display text-3xl font-semibold tabular-nums">{countdown(DateTime.fromISO(next.start).toMillis() - now)}</p>
                  <p className="text-xs text-muted">until it starts</p>
                </button>
              ) : (
                <p className="mt-2 text-ink-2">Nothing else scheduled today.</p>
              )}
            </div>
          </div>
        </Card>

        {/* Progress */}
        <Card className="flex items-center gap-5 p-5">
          <ProgressRing value={data.progress.percent} size={88} stroke={9}>
            <span className="text-lg font-semibold tabular-nums">{data.progress.percent}%</span>
          </ProgressRing>
          <div className="space-y-2">
            <div>
              <p className="text-sm font-semibold">Today</p>
              <p className="text-xs text-muted">{data.progress.done} of {data.progress.total} completed</p>
            </div>
            <div>
              <p className="text-sm font-semibold">This week</p>
              <p className="text-xs text-muted">{data.week.percent === null ? "Nothing due yet" : `${data.week.done} of ${data.week.due} done (${data.week.percent}%)`}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="flex gap-2">
        <Link href="/add" className="flex-1"><Button className="w-full"><Plus className="h-4 w-4" /> Quick Add</Button></Link>
        <Link href="/assistant" className="flex-1"><Button variant="soft" className="w-full"><Sparkles className="h-4 w-4 text-lavender" /> Ask AI</Button></Link>
        <Link href={current ? `/timer?a=${current.activityId}&d=${current.occurrenceDate}&title=${encodeURIComponent(current.title)}` : "/timer"} aria-label="Timer"><Button variant="secondary" className="w-full"><Timer className="h-4 w-4" /> <span className="hidden sm:inline">Timer</span></Button></Link>
      </div>

      {data.flagged.length > 0 && (
        <Card className="border-warn/40 bg-warn-soft/60 p-4">
          <p className="flex items-center gap-2 font-semibold"><Flag className="h-4 w-4 text-warn" /> Needs your attention</p>
          <ul className="mt-2 space-y-1">
            {data.flagged.map((o) => (
              <li key={o.key}><button className="text-left text-sm underline-offset-2 hover:underline" onClick={() => setOpen(o)}>{o.title} — {dayLabel(o.start, tz)} {t12(o.start, tz)}</button></li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <section className="min-w-0">
          <SectionTitle action={<Link href="/calendar" className="text-sm font-medium text-lavender">Calendar</Link>}>Today&apos;s timeline</SectionTitle>
          {data.today.length === 0 ? (
            <EmptyState title="A clear day" body="Nothing is scheduled today. Use Quick Add to plan something — or simply rest." />
          ) : (
            <Card className="p-2">
              <ol className="relative">
                {data.today.map((o) => {
                  const isCur = current?.key === o.key;
                  const color = o.category?.color ?? "#6b7280";
                  return (
                    <li key={o.key}>
                      <button onClick={() => setOpen(o)} className={clsx("group flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition", isCur ? "bg-lavender-soft ring-1 ring-lavender/40" : "hover:bg-surface-2/70")}>
                        <span className="w-[68px] shrink-0 text-right text-[13px] font-medium tabular-nums text-muted">{o.allDay ? "All day" : t12s(o.start, tz)}</span>
                        <span className={clsx("relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white", isCur && "animate-pulse-ring")} style={{ backgroundColor: o.state === "cancelled" ? "#9ca3af" : color }}>
                          {o.state === "completed" ? <Check className="h-4 w-4" /> : <CategoryIcon icon={o.category?.icon} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={clsx("block truncate text-[15px] font-medium", (o.state === "completed" || o.state === "skipped" || o.state === "cancelled") && "text-muted line-through decoration-1")}>{o.title}</span>
                          <span className="block text-xs text-muted">{o.allDay ? "" : `until ${t12(o.end, tz)}`}{o.location ? ` · ${o.location}` : ""}</span>
                        </span>
                        <StateBadge state={o.state} flagged={o.status === "needs_reschedule"} />
                      </button>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
        </section>

        <div className="min-w-0 space-y-6">
          <section>
            <SectionTitle action={<Link href="/habits" className="text-sm font-medium text-lavender">All</Link>}>Habit streaks</SectionTitle>
            <div className="grid grid-cols-2 gap-2">
              {data.habits.slice(0, 6).map((h) => (
                <Card key={h.id} className="flex items-center gap-3 p-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${h.color}22`, color: h.color }}><CategoryIcon icon={h.icon} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{h.name}</span>
                    <span className="flex items-center gap-1 text-xs text-muted"><Flame className={clsx("h-3.5 w-3.5", h.current > 0 && "text-warn")} />{h.current} day{h.current === 1 ? "" : "s"}{h.doneToday && " · ✓ today"}</span>
                  </span>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <SectionTitle action={<Link href="/reminders" className="text-sm font-medium text-lavender">Reminder Center</Link>}>Next reminders</SectionTitle>
            <Card className="divide-y divide-line">
              {data.reminders.length === 0 ? <p className="p-4 text-sm text-muted">No reminders scheduled in the next few hours.</p> : data.reminders.map((r) => (
                <div key={r.id} className="flex items-start gap-3 p-3">
                  <BellRing className="mt-0.5 h-4 w-4 shrink-0 text-lavender" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.body}</p>
                    <p className="text-xs text-muted">{t12(r.fire_at, tz)} · {dayLabel(r.fire_at, tz, "ccc")}</p>
                  </div>
                </div>
              ))}
            </Card>
          </section>

          {data.upcoming.length > 0 && (
            <section>
              <SectionTitle>Upcoming commitments</SectionTitle>
              <Card className="divide-y divide-line">
                {data.upcoming.map((o) => (
                  <button key={o.key} onClick={() => setOpen(o)} className="flex w-full items-center gap-3 p-3 text-left">
                    <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: o.category?.color ?? "#6b7280" }} />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{o.title}</span>
                    <span className="shrink-0 text-xs text-muted">{dayLabel(o.start, tz)} · {o.allDay ? "All day" : t12(o.start, tz)}</span>
                  </button>
                ))}
              </Card>
            </section>
          )}

          <section className="grid grid-cols-2 gap-2">
            <Card className="p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold"><Check className="h-4 w-4 text-sage" /> Completed</p>
              <p className="mt-1 font-display text-3xl font-semibold">{completed.length}</p>
              <p className="truncate text-xs text-muted">{completed.map((c) => c.title).join(", ") || "Nothing yet"}</p>
            </Card>
            <Card className="p-4">
              <p className="flex items-center gap-1.5 text-sm font-semibold"><TriangleAlert className="h-4 w-4 text-warn" /> Missed</p>
              <p className="mt-1 font-display text-3xl font-semibold">{missed.length}</p>
              <p className="truncate text-xs text-muted">{missed.length ? "Tap one to mark done if you did it" : "None — nice."}</p>
            </Card>
          </section>
        </div>
      </div>

      <ActivitySheet occ={open} tz={tz} categories={data.categories} onClose={() => setOpen(null)} onChanged={() => mutate()} />
    </div>
  );
}

function StateBadge({ state, flagged }: { state: string; flagged?: boolean }) {
  if (flagged) return <Badge color="#b7791f"><Flag className="h-3 w-3" /> Flagged</Badge>;
  switch (state) {
    case "completed": return <Badge color="#6f9a7c">Done</Badge>;
    case "skipped": return <Badge>Skipped</Badge>;
    case "missed": return <Badge color="#c2413b">Missed</Badge>;
    case "in_progress": return <Badge color="#6f9a7c"><Timer className="h-3 w-3" /> Running</Badge>;
    case "now": return <Badge color="#8b7fd6">Now</Badge>;
    case "cancelled": return <Badge>Cancelled</Badge>;
    default: return null;
  }
}

function DashboardSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-20 w-2/3" />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3"><Skeleton className="h-40 md:col-span-2" /><Skeleton className="h-40" /></div>
      <Skeleton className="h-11" />
      <Skeleton className="h-96" />
    </div>
  );
}
