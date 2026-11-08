import Link from "next/link";
import {
  ArrowLeft, ChevronRight, BookOpen, Brain, CalendarClock, Clock, Flame, Gauge, Hourglass, LayoutGrid, ListChecks, Maximize2, Medal, MessageCircle, Music,
  NotebookPen, Repeat, Bot, Sprout, Target, Timer, Trophy, Users, Watch, Zap, type LucideIcon,
} from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { elapsedSeconds, fmtMinutes, type FocusSession } from "@/lib/tools";
import { todayIn } from "@/lib/utils";

export const metadata = { title: "Tools" };

type Tool = { href?: string; label: string; desc: string; icon: LucideIcon };
type Section = { slug: string; title: string; blurb: string;  icon: LucideIcon; tools: Tool[] };

const SECTIONS: Section[] = [
  {
    slug: "focus", icon: Timer, title: "Focus & time", blurb: "Timers that keep going even if you close the app.",
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
    slug: "goals", icon: Target, title: "Goals & productivity", blurb: "Plan, track and finish.",
    tools: [
      { href: "/daily", label: "Daily goals", desc: "Speak your goals for today", icon: ListChecks },
      { href: "/tools/goals", label: "Goal tracker", desc: "Daily to quarterly goals", icon: Target },
      { href: "/tools/habits", label: "Habit tracker", desc: "Tick off daily habits", icon: Repeat },
      { href: "/tools/score", label: "Productivity score", desc: "Your week, out of 100", icon: Gauge },
      { href: "/tools/eisenhower", label: "Eisenhower matrix", desc: "Urgent vs important", icon: LayoutGrid },
      { href: "/tools/reflection", label: "Reflection & journal", desc: "Weekly review, daily notes", icon: NotebookPen },
      { href: "/tools/streaks", label: "Streaks", desc: "Don't break the chain", icon: Flame },
    ],
  },
  {
    slug: "brain", icon: Brain, title: "Brain gym", blurb: "Fun games for focus, memory and problem-solving. Brain training, not a medical test.",
    tools: [{ href: "/tools/brain", label: "20 brain games", desc: "Chess, Sudoku, 2048, memory, maze and more", icon: Brain }],
  },
  {
    slug: "accountability", icon: Users, title: "Accountability", blurb: "Pair up with a partner who keeps you on track.",
    tools: [
      { href: "/tools/accountability", label: "Accountability partner", desc: "Shared goals, check-ins, encouragement", icon: Users },
      { href: "/messages", label: "Private chat", desc: "Real-time messages with your partner", icon: MessageCircle },
    ],
  },
  {
    slug: "challenges", icon: Trophy, title: "Team challenges", blurb: "Compete and grow together.",
    tools: [
      { label: "Challenges arena", desc: "Focus, habit and sales challenges", icon: Trophy },
      { href: "/leaderboard", label: "Leaderboard", desc: "Office and team rankings", icon: Medal },
    ],
  },
  {
    slug: "growth", icon: Sprout, title: "Personal growth", blurb: "Learn, reflect and stay motivated.",
    tools: [
      { href: "/ai", label: "Maximus AI coach", desc: "Ask for a plan or advice", icon: Bot },
      { href: "/academy", label: "Academy", desc: "Courses and lessons", icon: BookOpen },
      { href: "/why", label: "My Why", desc: "Remember what drives you", icon: Target },
      { label: "Focus music", desc: "Background sounds while you work", icon: Music },
    ],
  },
];

export default async function ToolsPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c } = await searchParams;
  const open = SECTIONS.find((s) => s.slug === c);
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
      <PageHeader title="Tools" description="Focus, plan, build habits and train your brain."
        action={<LinkButton href="/tools/pomodoro"><Timer className="size-4" aria-hidden />Start a Pomodoro</LinkButton>} />
      {active && activePath && (
        <Link href={activePath} className="mb-6 flex items-center justify-between gap-3 rounded-xl border border-primary/30 bg-primary-soft px-5 py-4 text-fg">
          <span className="flex items-center gap-2 font-medium"><Timer className="size-5 text-primary" aria-hidden />
            {active.status === "paused" ? "Paused" : "Running"}: {active.label ?? active.kind.replace("_", " ")}</span>
          <span className="text-sm font-medium text-primary">Open timer</span>
        </Link>
      )}
      <div className="mb-10 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:max-w-md">
        <Link href="/tools/time-audit" className="bg-surface p-4 transition-colors hover:bg-surface-muted/60"><p className="text-sm text-fg-muted">Focused today</p><p className="mt-1 text-2xl font-semibold tabular-nums">{fmtMinutes(focusToday)}</p></Link>
        <Link href="/tools/score" className="bg-surface p-4 transition-colors hover:bg-surface-muted/60"><p className="text-sm text-fg-muted">Productivity score</p><p className="mt-1 text-2xl font-semibold tabular-nums">{sc ?? "—"}<span className="text-sm font-normal text-fg-subtle"> of 100</span></p></Link>
      </div>
      {open ? (
        <section aria-labelledby="sec-open">
          <Link href="/tools" className="mb-3 inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary"><ArrowLeft className="size-4" aria-hidden />All tools</Link>
          <h2 id="sec-open" className="text-xl font-semibold tracking-tight">{open.title}</h2>
          <p className="mb-4 text-fg-muted">{open.blurb}</p>
          <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {open.tools.map((t) => {
              const inner = (
                <>
                  <t.icon className="mt-0.5 size-5 shrink-0 text-fg-subtle" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{t.label}</span>
                    <span className="block text-sm text-fg-muted">{t.href ? t.desc : `${t.desc}. Coming in the next update.`}</span>
                  </span>
                  {t.href && <ChevronRight className="size-4 shrink-0 self-center text-fg-subtle" aria-hidden />}
                </>
              );
              return (
                <li key={t.label} className="bg-surface">
                  {t.href ? (
                    <Link href={t.href} className="flex gap-3 p-4 transition-colors hover:bg-surface-muted/60">{inner}</Link>
                  ) : (
                    <div className="flex gap-3 p-4 opacity-70" aria-disabled>{inner}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ) : (
        <ul className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.slug} className="bg-surface">
              <Link href={s.slug === "brain" ? "/tools/brain" : `/tools?c=${s.slug}`} className="flex gap-3 p-5 transition-colors hover:bg-surface-muted/60">
                <s.icon className="mt-0.5 size-5 shrink-0 text-fg-subtle" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{s.title}</span>
                  <span className="block text-sm text-fg-muted">{s.blurb}</span>
                  <span className="mt-1 block text-sm text-fg-subtle">{s.tools.some((t) => t.href) ? (s.slug === "brain" ? "20 games" : `${s.tools.filter((t) => t.href).length} tools`) : "Coming in the next update"}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 self-center text-fg-subtle" aria-hidden />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
