import Link from "next/link";
import {
  BookOpen, Brain, CalendarClock, Clock, Flame, Gauge, Hourglass, LayoutGrid, ListChecks, Maximize2, Medal, Music,
  NotebookPen, Repeat, Sparkles, Target, Timer, Trophy, Users, Watch, Zap, type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { elapsedSeconds, fmtMinutes, type FocusSession } from "@/lib/tools";
import { cn, todayIn } from "@/lib/utils";

export const metadata = { title: "Tools" };

type Tool = { href?: string; label: string; desc: string; icon: LucideIcon };
type Section = { title: string; blurb: string; tone: string; tools: Tool[] };

const SECTIONS: Section[] = [
  {
    title: "Focus & time", blurb: "Timers that keep going even if you close the app.", tone: "bg-primary-soft text-primary",
    tools: [
      { href: "/tools/pomodoro", label: "Pomodoro", desc: "25-minute sprints with breaks", icon: Timer },
      { href: "/tools/focus", label: "Focus mode", desc: "Full-screen, distraction-free", icon: Maximize2 },
      { href: "/tools/deep-work", label: "Deep work", desc: "45–120 min, track interruptions", icon: Zap },
      { href: "/tools/countdown", label: "Countdown", desc: "Beat the clock", icon: Hourglass },
      { href: "/tools/stopwatch", label: "Stopwatch", desc: "With laps", icon: Watch },
      { href: "/tools/time-blocks", label: "Time blocking", desc: "Plan your day hour by hour", icon: CalendarClock },
      { href: "/tools/time-audit", label: "Time audit", desc: "Where your time went", icon: Clock },
      { href: "/tools/two-minute", label: "2-minute challenge", desc: "Beat procrastination now", icon: Flame },
    ],
  },
  {
    title: "Goals & productivity", blurb: "Plan, track and finish.", tone: "bg-success-soft text-success",
    tools: [
      { href: "/planner", label: "Daily planner", desc: "Your smart to-do list", icon: ListChecks },
      { href: "/tools/goals", label: "Goal tracker", desc: "Daily to quarterly goals", icon: Target },
      { href: "/tools/habits", label: "Habit tracker", desc: "Tick off daily habits", icon: Repeat },
      { href: "/tools/score", label: "Productivity score", desc: "Your week, out of 100", icon: Gauge },
      { href: "/tools/eisenhower", label: "Eisenhower matrix", desc: "Urgent vs important", icon: LayoutGrid },
      { href: "/tools/reflection", label: "Reflection & journal", desc: "Weekly review, daily notes", icon: NotebookPen },
      { href: "/tools/streaks", label: "Streaks", desc: "Don't break the chain", icon: Flame },
    ],
  },
  {
    title: "Brain gym", blurb: "Fun games for focus, memory and problem-solving. Brain training, not a medical test.", tone: "bg-warning-soft text-warning",
    tools: [{ label: "20 brain games", desc: "Chess, Sudoku, 2048, memory and more", icon: Brain }],
  },
  {
    title: "Accountability", blurb: "Pair up with a partner who keeps you on track.", tone: "bg-primary-soft text-primary",
    tools: [{ label: "Accountability partner", desc: "Shared goals, check-ins and private chat", icon: Users }],
  },
  {
    title: "Team challenges", blurb: "Compete and grow together.", tone: "bg-danger-soft text-danger",
    tools: [
      { label: "Challenges arena", desc: "Focus, habit and sales challenges", icon: Trophy },
      { href: "/leaderboard", label: "Leaderboard", desc: "Office and team rankings", icon: Medal },
    ],
  },
  {
    title: "Personal growth", blurb: "Learn, reflect and stay motivated.", tone: "bg-brand-lime/25 text-brand-navy dark:text-brand-lime",
    tools: [
      { href: "/ai", label: "Maximus AI coach", desc: "Ask for a plan or advice", icon: Sparkles },
      { href: "/academy", label: "Academy", desc: "Courses and lessons", icon: BookOpen },
      { href: "/why", label: "My Why", desc: "Remember what drives you", icon: Target },
      { label: "Focus music", desc: "Background sounds while you work", icon: Music },
    ],
  },
];

export default async function ToolsPage() {
  const viewer = await requireViewer();
  const today = todayIn(viewer.profile.timezone);
  const supabase = await createClient();
  const [{ data: active }, { data: todays }, { data: score }] = await Promise.all([
    supabase.from("focus_sessions").select("*").eq("user_id", viewer.id).in("status", ["running", "paused"]).order("started_at", { ascending: false }).limit(1).maybeSingle<FocusSession>(),
    supabase.from("focus_sessions").select("*").eq("user_id", viewer.id).eq("status", "completed").neq("kind", "break").gte("started_at", `${today}T00:00:00`).returns<FocusSession[]>(),
    supabase.rpc("productivity_score"),
  ]);
  const focusToday = (todays ?? []).reduce((a, s) => a + elapsedSeconds(s) / 60, 0);
  const sc = (score as { score: number | null } | null)?.score ?? null;
  const activePath = active ? ({ pomodoro: "/tools/pomodoro", break: "/tools/pomodoro", deep_work: "/tools/deep-work", stopwatch: "/tools/stopwatch", countdown: "/tools/countdown", focus: "/tools/focus" } as const)[active.kind] : null;

  return (
    <>
      <PageHeader eyebrow="Tools" title="Your productivity toolkit" description="Focus, plan, build habits and train your brain." />
      {active && activePath && (
        <Link href={activePath} className="mb-6 flex items-center justify-between gap-3 rounded-2xl bg-primary px-5 py-4 text-primary-fg shadow-sm">
          <span className="flex items-center gap-2 font-medium"><Timer className="size-5" aria-hidden />
            {active.status === "paused" ? "Paused" : "Running"}: {active.label ?? active.kind.replace("_", " ")}</span>
          <span className="text-sm underline">Open timer</span>
        </Link>
      )}
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Link href="/tools/time-audit" className="card p-4"><p className="text-sm text-fg-muted">Focused today</p><p className="mt-1 text-2xl font-bold tabular-nums">{fmtMinutes(focusToday)}</p></Link>
        <Link href="/tools/score" className="card p-4"><p className="text-sm text-fg-muted">Productivity score</p><p className="mt-1 text-2xl font-bold tabular-nums">{sc ?? "—"}<span className="text-sm font-normal text-fg-subtle">/100</span></p></Link>
        <Link href="/tools/pomodoro" className="card col-span-2 flex items-center justify-center gap-2 bg-primary p-4 font-semibold text-primary-fg sm:col-span-1"><Timer className="size-5" aria-hidden /> Start a Pomodoro</Link>
      </div>
      <div className="space-y-8">
        {SECTIONS.map((s, si) => (
          <section key={s.title} aria-labelledby={`sec-${si}`}>
            <h2 id={`sec-${si}`} className="text-lg font-semibold">{s.title}</h2>
            <p className="mb-3 text-sm text-fg-muted">{s.blurb}</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {s.tools.map((t) => {
                const inner = (
                  <>
                    <span className={cn("grid size-10 place-items-center rounded-xl", s.tone)}><t.icon className="size-5" aria-hidden /></span>
                    <p className="mt-3 font-medium">{t.label}</p>
                    <p className="text-xs text-fg-muted">{t.desc}</p>
                    {!t.href && <span className="mt-2 inline-block rounded-full bg-surface-muted px-2 py-0.5 text-[11px] text-fg-muted">Coming in the next update</span>}
                  </>
                );
                return t.href ? (
                  <Link key={t.label} href={t.href} className="card p-4 transition-shadow hover:shadow-md">{inner}</Link>
                ) : (
                  <div key={t.label} className="card p-4 opacity-75" aria-disabled>{inner}</div>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </>
  );
}
