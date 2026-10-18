import { Repeat } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { addDays } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { habitStreak, type Habit } from "@/lib/tools";
import { todayIn } from "@/lib/utils";
import { BackToTools } from "../timer-page";
import { HabitForm, HabitRow } from "./habit-ui";

export const metadata = { title: "Habit tracker" };

export default async function HabitsPage() {
  const viewer = await requireViewer();
  const today = todayIn(viewer.profile.timezone);
  const supabase = await createClient();
  const [{ data: habits }, { data: checks }] = await Promise.all([
    supabase.from("habits").select("*").eq("user_id", viewer.id).eq("archived", false).order("created_at").returns<Habit[]>(),
    supabase.from("habit_checks").select("habit_id, check_date").eq("user_id", viewer.id).gte("check_date", addDays(today, -400)),
  ]);
  const byHabit = new Map<string, Set<string>>();
  for (const c of checks ?? []) {
    if (!byHabit.has(c.habit_id)) byHabit.set(c.habit_id, new Set());
    byHabit.get(c.habit_id)!.add(c.check_date);
  }
  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));
  const list = (habits ?? []).map((h) => {
    const set = byHabit.get(h.id) ?? new Set<string>();
    const due30 = Array.from({ length: 30 }, (_, i) => addDays(today, -i)).filter((d) => d >= h.created_at.slice(0, 10) && h.days.includes(new Date(`${d}T12:00:00Z`).getUTCDay() || 7));
    return {
      habit: h, streak: habitStreak(h.days, set, today), checks: week.filter((d) => set.has(d)),
      rate: due30.length ? Math.round((due30.filter((d) => set.has(d)).length / due30.length) * 100) : null,
    };
  });

  return (
    <>
      <PageHeader eyebrow="Goals & productivity" title="Habit tracker" description="Small daily actions, done consistently. Tick them off each day." action={<BackToTools c="goals" />} />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="This week" description="Tap a day to tick it. Greyed days aren't scheduled for that habit." />
          <CardBody>
            {list.length === 0 ? (
              <EmptyState icon={<Repeat className="size-6" aria-hidden />} title="No habits yet" description="Start with one or two: e.g. Invite 3 people, Read 10 pages, Pray, Exercise." />
            ) : (
              <div className="space-y-3">
                {list.map((x) => <HabitRow key={x.habit.id} habit={x.habit} week={week} today={today} checked={x.checks} streak={x.streak} rate={x.rate} />)}
              </div>
            )}
          </CardBody>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Add a new habit" description="Four quick steps." />
          <CardBody><HabitForm /></CardBody>
        </Card>
      </div>
    </>
  );
}
