import Link from "next/link";
import { CalendarDays, CircleCheckBig, Lightbulb, ListChecks, TriangleAlert } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { addDays, type Task } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { cn, currentEvaluationPeriod, evaluationDates, formatDate, monthStart, todayIn } from "@/lib/utils";
import { MoveAllButton, SpreadButton, SuggestionButton, TaskQuickAdd, TaskRow } from "./task-ui";

export const metadata = { title: "Daily planner" };

const VIEWS = [
  { key: "today", label: "Today" },
  { key: "overdue", label: "Overdue" },
  { key: "upcoming", label: "Upcoming" },
  { key: "done", label: "Completed" },
] as const;
type View = (typeof VIEWS)[number]["key"];

export default async function PlannerPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const viewer = await requireViewer();
  const { view: rawView } = await searchParams;
  const view: View = (VIEWS.find((v) => v.key === rawView)?.key ?? "today");
  const today = todayIn(viewer.profile.timezone);
  const supabase = await createClient();

  const [{ data: open }, { data: done }, { data: followUps }, { data: recentProspect }, { data: evaluation }, { data: goal }] = await Promise.all([
    supabase.from("tasks").select("*").eq("user_id", viewer.id).is("completed_at", null)
      .order("due_date", { ascending: true, nullsFirst: false }).order("priority").order("created_at").limit(300).returns<Task[]>(),
    supabase.from("tasks").select("*").eq("user_id", viewer.id).not("completed_at", "is", null)
      .order("completed_at", { ascending: false }).limit(view === "done" ? 60 : 30).returns<Task[]>(),
    supabase.from("prospects").select("full_name").eq("owner_id", viewer.id).eq("opted_out", false)
      .not("next_follow_up_at", "is", null).lte("next_follow_up_at", `${today}T23:59:59`)
      .not("stage", "in", "(joined,customer,not_now)").limit(20),
    supabase.from("prospects").select("created_at").eq("owner_id", viewer.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("evaluations").select("id").eq("user_id", viewer.id).eq("period_date", currentEvaluationPeriod(today)).maybeSingle(),
    supabase.from("monthly_goals").select("id, status").eq("user_id", viewer.id).eq("month", monthStart(today)).maybeSingle(),
  ]);
  const tasks = open ?? [];
  const overdue = tasks.filter((t) => t.due_date && t.due_date < today);
  const dueToday = tasks.filter((t) => t.due_date === today);
  const upcoming = tasks.filter((t) => !t.due_date || t.due_date > today);
  const doneToday = (done ?? []).filter((t) => t.completed_at && todayIn(viewer.profile.timezone) === new Intl.DateTimeFormat("en-CA", { timeZone: viewer.profile.timezone }).format(new Date(t.completed_at)));
  const counts: Record<View, number> = { today: dueToday.length, overdue: overdue.length, upcoming: upcoming.length, done: (done ?? []).length };

  // Names of leaders who assigned tasks.
  const assignerIds = [...new Set([...tasks, ...(done ?? [])].map((t) => t.assigned_by).filter(Boolean) as string[])];
  const { data: assigners } = assignerIds.length
    ? await supabase.from("profiles").select("id, full_name").in("id", assignerIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameOf = (id: string | null) => (id ? (assigners ?? []).find((a) => a.id === id)?.full_name?.split(" ")[0] ?? "your leader" : undefined);

  // Suggestions from what's actually due. Nothing is added without the member's tap.
  const existing = new Set(tasks.map((t) => t.title.toLowerCase()));
  const suggestions: { title: string; category: string; why: string }[] = [];
  const fu = (followUps ?? []) as { full_name: string }[];
  if (fu.length > 0) suggestions.push({
    title: `Follow up with ${fu.length === 1 ? fu[0].full_name : `${fu.length} prospects`}`, category: "follow_up",
    why: fu.length === 1 ? "Their follow-up is due today." : `Due: ${fu.slice(0, 3).map((p) => p.full_name.split(" ")[0]).join(", ")}${fu.length > 3 ? "…" : ""}`,
  });
  const lastAdded = (recentProspect as { created_at: string } | null)?.created_at?.slice(0, 10);
  if (!lastAdded || lastAdded < addDays(today, -3)) suggestions.push({ title: "Add 3 new prospects", category: "prospecting", why: "You haven't added anyone new in a few days." });
  if (!evaluation && evaluationDates(today).includes(today)) suggestions.push({ title: "Complete my 5-day evaluation", category: "other", why: "Today is an evaluation day." });
  if (!goal || (goal as { status: string }).status === "draft") suggestions.push({ title: "Set and submit my monthly goals", category: "other", why: "Your goals for this month aren't submitted yet." });
  suggestions.push({ title: "Do one Academy lesson", category: "training", why: "Ten minutes of learning a day adds up." });
  const fresh = suggestions.filter((s) => !existing.has(s.title.toLowerCase())).slice(0, 4);

  const list = view === "today" ? dueToday : view === "overdue" ? overdue : view === "upcoming" ? upcoming : (done ?? []);

  return (
    <>
      <PageHeader eyebrow="Daily planner" title={formatDate(today, { weekday: "long", day: "numeric", month: "long" }, viewer.profile.timezone)}
        description={dueToday.length === 0 && doneToday.length === 0 ? "Plan your day. Small daily actions build big results."
          : `${doneToday.length} done, ${dueToday.length} to go today.`} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card><CardBody><TaskQuickAdd today={today} /></CardBody></Card>

          {view === "today" && overdue.length > 0 && (
            <div className="flex flex-col gap-3 rounded-2xl bg-warning-soft p-4 sm:flex-row sm:items-center">
              <TriangleAlert className="size-5 shrink-0 text-warning" aria-hidden />
              <p className="flex-1 text-sm">
                <b>{overdue.length}</b> unfinished {overdue.length === 1 ? "task" : "tasks"} from earlier.
                {overdue.length >= 4 ? " That's a lot for one day. Spread them over the next three days?" : " Bring them into today?"}
              </p>
              <div className="flex flex-wrap gap-2">
                {overdue.length >= 4 && <SpreadButton ids={overdue.map((t) => t.id)} today={today} />}
                <MoveAllButton ids={overdue.map((t) => t.id)} today={today} label="Move all to today" />
              </div>
            </div>
          )}

          <Card>
            <nav aria-label="Planner views" className="scrollbar-none flex gap-1 overflow-x-auto border-b border-border px-3 pt-3">
              {VIEWS.map((v) => (
                <Link key={v.key} href={`/planner?view=${v.key}`} aria-current={view === v.key ? "page" : undefined}
                  className={cn("-mb-px flex shrink-0 items-center gap-1.5 border-b-2 px-3 pb-2.5 text-sm",
                    view === v.key ? "border-primary font-semibold text-fg" : "border-transparent text-fg-muted hover:text-fg")}>
                  {v.label}
                  <span className={cn("rounded-full px-1.5 text-xs tabular-nums", v.key === "overdue" && counts.overdue > 0 ? "bg-danger-soft text-danger" : "bg-surface-muted")}>{counts[v.key]}</span>
                </Link>
              ))}
            </nav>
            <CardBody className="pt-2">
              {list.length > 0 ? (
                <ul className="divide-y divide-border/60">
                  {list.map((t) => <TaskRow key={t.id} task={t} today={today} assignerName={nameOf(t.assigned_by)} />)}
                </ul>
              ) : (
                <EmptyState icon={view === "done" ? <CircleCheckBig className="size-6" /> : <ListChecks className="size-6" />}
                  title={view === "today" ? "Nothing planned for today" : view === "overdue" ? "You're all caught up" : view === "upcoming" ? "Nothing coming up" : "No completed tasks yet"}
                  description={view === "today" ? "Add a task above, or pick one of the suggestions." : undefined} />
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Suggested for today" icon={<Lightbulb className="size-4" />} description="Based on your follow-ups, goals and evaluations" />
            <CardBody className="space-y-3 pt-3">
              {fresh.length > 0 ? fresh.map((s) => (
                <div key={s.title} className="flex items-start gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.title}</p>
                    <p className="text-xs text-fg-subtle">{s.why}</p>
                  </div>
                  <SuggestionButton title={s.title} category={s.category} today={today} />
                </div>
              )) : <p className="py-4 text-center text-sm text-fg-muted">You&apos;ve planned everything we&apos;d suggest.</p>}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="This week" icon={<CalendarDays className="size-4" />} />
            <CardBody className="pt-3">
              <ul className="space-y-1.5">
                {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => {
                  const n = tasks.filter((t) => t.due_date === d).length;
                  return (
                    <li key={d} className="flex items-center justify-between text-sm">
                      <span className={d === today ? "font-semibold" : "text-fg-muted"}>{i18nDay(d, today)}</span>
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 rounded-full bg-primary/70" style={{ width: `${Math.min(n, 10) * 8}px` }} aria-hidden />
                        <span className="w-5 text-right tabular-nums">{n}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}

function i18nDay(d: string, today: string) {
  if (d === today) return "Today";
  if (d === addDays(today, 1)) return "Tomorrow";
  return formatDate(d, { weekday: "long", day: "numeric", month: "short" });
}
