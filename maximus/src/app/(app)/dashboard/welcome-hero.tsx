import Link from "next/link";
import { CalendarClock, CalendarDays, ClipboardCheck, Crown, Flame, MapPin, Moon, Sparkles, Sun, Sunrise, Target } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Avatar } from "@/components/ui/misc";

type Props = {
  firstName: string; avatar: string | null; hour: number; dateLabel: string; memberId: string;
  rank: string | null; role: string | null; streak: number; checkedInAt: string | null; evaluationDue: boolean;
  nextEvaluation: string; goalPct: number; hasGoals: boolean; word: string;
};

function partOfDay(hour: number) {
  if (hour < 12) return { hello: "Good morning", icon: Sunrise, note: "A fresh day to build your empire." };
  if (hour < 17) return { hello: "Good afternoon", icon: Sun, note: "Keep the momentum going strong." };
  return { hello: "Good evening", icon: Moon, note: "Finish strong and plan tomorrow's wins." };
}

function goalNote(pct: number, hasGoals: boolean) {
  if (!hasGoals) return "Set this month's goals to see your progress here.";
  if (pct >= 100) return "Goals smashed! Time to raise the bar. 🏆";
  if (pct >= 75) return "So close. One more push gets you there.";
  if (pct >= 40) return "Halfway and climbing. Stay consistent.";
  if (pct > 0) return "Good start. Small wins add up every day.";
  return "Every big month starts with one action today.";
}

/** The welcome banner at the top of Home, for members and admins alike. */
export function WelcomeHero(p: Props) {
  const day = partOfDay(p.hour);
  const DayIcon = day.icon;
  const pct = Math.max(0, Math.min(100, p.goalPct));
  return (
    <section className="hero-gradient relative isolate overflow-hidden rounded-[1.75rem] p-5 text-white sm:p-8 animate-rise" aria-label="Welcome">
      {/* soft glow and dot texture */}
      <div className="pointer-events-none absolute -right-16 -top-20 -z-10 size-72 rounded-full bg-brand-lime/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-24 -left-10 -z-10 size-72 rounded-full bg-brand-blue/40 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07] [background-image:radial-gradient(white_1px,transparent_1px)] [background-size:18px_18px]" aria-hidden />

      <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-white/75">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15"><CalendarDays className="size-3.5" aria-hidden />{p.dateLabel}</span>
        <span className="inline-flex items-center rounded-full bg-white/10 px-3 py-1 ring-1 ring-white/15">{p.memberId}</span>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_minmax(0,22rem)] lg:items-end">
        <div className="min-w-0">
          <div className="flex items-center gap-4">
            <div className="relative shrink-0">
              <Avatar name={p.firstName} src={p.avatar} size={72} className="ring-4 ring-white/15" />
              <span className="absolute -bottom-1 -right-1 grid size-7 place-items-center rounded-full bg-brand-lime text-brand-navy ring-4 ring-[color:var(--brand-navy)]">
                <DayIcon className="size-3.5" aria-hidden />
              </span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-white/75">{day.hello},</p>
              <h1 className="truncate text-3xl font-extrabold tracking-tight sm:text-5xl">{p.firstName}</h1>
            </div>
          </div>

          {(p.rank || p.role) && (
            <div className="mt-4 flex flex-wrap gap-2">
              {p.rank && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-lime px-3 py-1 text-xs font-bold text-brand-navy shadow-sm">
                  <Crown className="size-3.5" aria-hidden />{p.rank}
                </span>
              )}
              {p.role && <span className="inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-xs font-semibold ring-1 ring-white/20">{p.role}</span>}
            </div>
          )}

          <p className="mt-4 max-w-xl text-base text-white/85 sm:text-lg">{day.note}</p>
          <p className="mt-2 flex max-w-xl items-start gap-2 text-sm italic text-white/70">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-brand-lime" aria-hidden />“{p.word}”
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {p.checkedInAt ? (
              <span className="inline-flex h-11 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-medium ring-1 ring-white/20">
                <span className="size-2 animate-pulse rounded-full bg-brand-green" aria-hidden /> Checked in at {p.checkedInAt}
              </span>
            ) : (
              <LinkButton href="/attendance" variant="lime"><MapPin className="size-4" aria-hidden /> Check in</LinkButton>
            )}
            {p.evaluationDue && (
              <LinkButton href="/evaluations/new" variant="outline" className="border-white/25 bg-white/5 text-white hover:bg-white/10">
                <ClipboardCheck className="size-4" aria-hidden /> Complete evaluation
              </LinkButton>
            )}
          </div>
        </div>

        {/* This month at a glance */}
        <div className="rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur-md">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-sm font-semibold"><Target className="size-4 text-brand-lime" aria-hidden />This month</p>
            <Link href="/goals" className="text-xs font-medium text-white/70 hover:text-white">{p.hasGoals ? "View goals" : "Set goals"} →</Link>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Monthly goals">
            <div className="h-full rounded-full bg-gradient-to-r from-brand-green to-brand-lime" style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-white/80"><b className="text-white">{pct}%</b> of your goals · {goalNote(pct, p.hasGoals)}</p>
          <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/10 p-3">
              <p className="flex items-center gap-1.5 text-xs text-white/65"><Flame className="size-3.5 text-brand-lime" aria-hidden />Streak</p>
              <p className="mt-0.5 font-bold">{p.streak} day{p.streak === 1 ? "" : "s"}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3">
              <p className="flex items-center gap-1.5 text-xs text-white/65"><CalendarClock className="size-3.5 text-brand-lime" aria-hidden />Next evaluation</p>
              <p className="mt-0.5 font-bold">{p.nextEvaluation}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
