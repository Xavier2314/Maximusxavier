import Link from "next/link";
import { Flame } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { addDays } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { dayStreak, habitStreak } from "@/lib/tools";
import { cn, todayIn } from "@/lib/utils";
import { BackToTools } from "../timer-page";

export const metadata = { title: "Streaks" };

export default async function StreaksPage() {
  const viewer = await requireViewer();
  const tz = viewer.profile.timezone;
  const today = todayIn(tz);
  const since = addDays(today, -365);
  const supabase = await createClient();
  const [{ data: attendance }, { data: sessions }, { data: tasks }, { data: journal }, { data: habits }, { data: checks }] = await Promise.all([
    supabase.rpc("attendance_streak"),
    supabase.from("focus_sessions").select("started_at").eq("user_id", viewer.id).eq("status", "completed").neq("kind", "break").gte("started_at", `${since}T00:00:00`),
    supabase.from("tasks").select("completed_at").eq("user_id", viewer.id).gte("completed_at", `${since}T00:00:00`),
    supabase.from("journal_entries").select("entry_date").eq("user_id", viewer.id).eq("kind", "journal").gte("entry_date", since),
    supabase.from("habits").select("id, name, icon, days").eq("user_id", viewer.id).eq("archived", false),
    supabase.from("habit_checks").select("habit_id, check_date").eq("user_id", viewer.id).gte("check_date", since),
  ]);
  const local = (iso: string) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(iso));
  const focus = dayStreak(new Set((sessions ?? []).map((s) => local(s.started_at))), today);
  const task = dayStreak(new Set((tasks ?? []).map((t) => local(t.completed_at as string))), today);
  const journ = dayStreak(new Set((journal ?? []).map((j) => j.entry_date as string)), today);
  const habitList = (habits ?? []).map((h) => ({
    ...h, streak: habitStreak(h.days as number[], new Set((checks ?? []).filter((c) => c.habit_id === h.id).map((c) => c.check_date as string)), today),
  })).sort((a, b) => b.streak - a.streak);

  const tiles = [
    { label: "Office check-in", current: (attendance as number | null) ?? 0, best: null as number | null, unit: "working days", href: "/attendance" },
    { label: "Focus sessions", current: focus.current, best: focus.best, unit: "days", href: "/tools/pomodoro" },
    { label: "Tasks completed", current: task.current, best: task.best, unit: "days", href: "/planner" },
    { label: "Daily journal", current: journ.current, best: journ.best, unit: "days", href: "/tools/reflection?tab=journal" },
  ];

  return (
    <>
      <PageHeader eyebrow="Goals & productivity" title="Streaks" description="Days in a row you showed up. Don't break the chain." action={<BackToTools c="goals" />} />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href} className="card p-5 transition-shadow hover:shadow-md">
            <p className="text-sm text-fg-muted">{t.label}</p>
            <p className={cn("mt-2 flex items-center gap-2 text-4xl font-bold tabular-nums", t.current > 0 ? "text-warning" : "text-fg-subtle")}>
              <Flame className="size-8" aria-hidden />{t.current}
            </p>
            <p className="mt-1 text-xs text-fg-subtle">{t.unit}{t.best ? ` · best ${t.best}` : ""}</p>
          </Link>
        ))}
      </div>
      <Card className="mt-6">
        <CardBody>
          <p className="mb-3 font-semibold">Habit streaks</p>
          {habitList.length === 0 ? (
            <p className="text-sm text-fg-muted">No habits yet. <Link href="/tools/habits" className="text-primary">Add one</Link>.</p>
          ) : (
            <ul className="divide-y divide-border">
              {habitList.map((h) => (
                <li key={h.id} className="flex items-center justify-between py-2 text-sm">
                  <span>{h.icon ? `${h.icon} ` : ""}{h.name}</span>
                  <span className={cn("inline-flex items-center gap-1 font-semibold tabular-nums", h.streak ? "text-warning" : "text-fg-subtle")}><Flame className="size-4" aria-hidden />{h.streak}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </>
  );
}
