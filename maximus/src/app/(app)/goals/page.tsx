import Link from "next/link";
import { CalendarRange, ChevronRight, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { GoalStatus } from "@/components/goal-status";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MonthlyGoal } from "@/lib/types";
import { addMonths, formatDate, monthStart, todayIn } from "@/lib/utils";
import { GoalTabs, PeriodView } from "./period-view";

export const metadata = { title: "Goals" };

type TeamGoal = MonthlyGoal & { profiles: { full_name: string; avatar_url: string | null } | null };

export default async function GoalsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const today = todayIn(viewer.profile.timezone);
  const { view: rawView } = await searchParams;
  const view = rawView === "weekly" || rawView === "daily" ? rawView : "monthly";

  if (view !== "monthly") return <PeriodView view={view} />;
  const thisMonth = monthStart(today);
  const nextMonth = addMonths(thisMonth, 1);
  const day = Number(today.slice(8, 10));
  const inWindow = day >= 10 && day <= 15;

  const [{ data: mine }, { data: team }] = await Promise.all([
    supabase.from("monthly_goals").select("*").eq("user_id", viewer.id).order("month", { ascending: false }).limit(12).returns<MonthlyGoal[]>(),
    viewer.can("review_member_goals")
      ? supabase.from("monthly_goals").select("*, profiles!monthly_goals_user_id_fkey(full_name, avatar_url)")
          .neq("user_id", viewer.id).in("status", ["submitted", "approved", "revision_requested"])
          .gte("month", thisMonth).order("submitted_at", { ascending: false }).limit(30).returns<TeamGoal[]>()
      : Promise.resolve({ data: [] as TeamGoal[] }),
  ]);
  const current = mine?.find((g) => g.month === thisMonth);
  const upcoming = mine?.find((g) => g.month === nextMonth);
  const toReview = (team ?? []).filter((g) => g.status === "submitted");

  return (
    <>
      <PageHeader title="Monthly goals" description="Set clear targets, get your sponsor's feedback and watch your progress update automatically."
        action={<LinkButton href={`/goals/new?month=${upcoming ? thisMonth : nextMonth}`}><Plus className="size-4" aria-hidden /> Set goals</LinkButton>} />
      <GoalTabs view="monthly" />

      {inWindow && !upcoming && (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-brand-lime/25 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-2 text-sm font-medium text-brand-navy dark:text-brand-lime">
            <CalendarRange className="size-4" aria-hidden /> Goal-setting window is open until the 15th — set your goals for {formatDate(nextMonth, { month: "long" })}.
          </p>
          <LinkButton href={`/goals/new?month=${nextMonth}`} size="sm" variant="primary">Set {formatDate(nextMonth, { month: "long" })} goals</LinkButton>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {[{ label: "This month", month: thisMonth, goal: current }, { label: "Next month", month: nextMonth, goal: upcoming }].map(({ label, month, goal }) => (
            <Card key={month}>
              <CardHeader title={formatDate(month, { month: "long", year: "numeric" })} description={label}
                action={goal && <GoalStatus status={goal.status} />} />
              <CardBody>
                {goal ? (
                  <Link href={`/goals/${goal.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-border p-4 transition-colors hover:bg-surface-muted/60">
                    <span>{goalSummary(goal)}</span>
                    <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
                  </Link>
                ) : (
                  <EmptyState art="tasks" className="py-6" title="No goals yet"
                    action={<LinkButton href={`/goals/new?month=${month}`} size="sm">Set {formatDate(month, { month: "long" })} goals</LinkButton>} />
                )}
              </CardBody>
            </Card>
          ))}
          {mine && mine.filter((g) => g.month < thisMonth).length > 0 && (
            <Card>
              <CardHeader title="History" />
              <CardBody className="pt-2">
                <ul className="divide-y divide-border">
                  {mine.filter((g) => g.month < thisMonth).map((g) => (
                    <li key={g.id}>
                      <Link href={`/goals/${g.id}`} className="flex items-center justify-between py-3 hover:opacity-80">
                        <span className="text-sm font-medium">{formatDate(g.month, { month: "long", year: "numeric" })}</span>
                        <GoalStatus status={g.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          )}
        </div>

        {viewer.can("review_member_goals") && (
          <Card className="h-fit">
            <CardHeader title="Team goals" description={`${toReview.length} waiting for review`} />
            <CardBody className="pt-2">
              {(team ?? []).length > 0 ? (
                <ul className="space-y-1">
                  {(team ?? []).map((g) => (
                    <li key={g.id}>
                      <Link href={`/goals/${g.id}`} className="flex items-center gap-3 rounded-xl p-2 hover:bg-surface-muted">
                        <Avatar name={g.profiles?.full_name ?? "Member"} src={g.profiles?.avatar_url} size={34} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{g.profiles?.full_name}</span>
                          <span className="text-xs text-fg-subtle">{formatDate(g.month, { month: "long" })}</span>
                        </span>
                        <GoalStatus status={g.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : <p className="py-6 text-center text-sm text-fg-muted">No team goals yet.</p>}
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}

/** "Targets for income, sales and savings, plus 2 custom goals" */
function goalSummary(goal: MonthlyGoal): string {
  const names = [
    goal.income_target && "income", goal.sales_target && "sales", goal.prospecting_target && "prospecting",
    goal.recruitment_target && "recruitment", goal.order_target && "orders", goal.savings_target && "savings",
  ].filter(Boolean) as string[];
  const custom = goal.custom_goals?.length ?? 0;
  const extra = custom ? `${custom} custom ${custom === 1 ? "goal" : "goals"}` : "";
  if (!names.length) return extra ? `${extra.charAt(0).toUpperCase()}${extra.slice(1)}` : "Personal goals";
  return `Targets for ${new Intl.ListFormat("en", { type: "conjunction" }).format(names)}${extra ? `, plus ${extra}` : ""}`;
}
