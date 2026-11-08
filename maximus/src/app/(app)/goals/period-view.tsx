import Link from "next/link";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, todayIn } from "@/lib/utils";
import { PeriodGoals } from "./period-goals";

/** Monthly, weekly or daily: the same place for every size of goal. */
export function GoalTabs({ view }: { view: "monthly" | "weekly" | "daily" }) {
  const tabs = [{ key: "monthly", label: "Monthly", href: "/goals" }, { key: "weekly", label: "Weekly", href: "/goals?view=weekly" }, { key: "daily", label: "Daily", href: "/daily" }] as const;
  return (
    <nav aria-label="Goal period" className="mb-6 flex gap-2">
      {tabs.map((t) => (
        <Link key={t.key} href={t.href} aria-current={view === t.key ? "page" : undefined}
          className={cn("inline-flex h-11 items-center rounded-full px-5 font-medium transition-colors",
            view === t.key ? "bg-fg text-bg" : "bg-surface text-fg hover:bg-surface-muted")}>{t.label}</Link>
      ))}
    </nav>
  );
}

/** The weekly or daily goals screen: speak, arrange a draft, save, tick off. */
export async function PeriodView({ view }: { view: "weekly" | "daily" }) {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const today = todayIn(viewer.profile.timezone);
  const { data: rows } = await supabase.from("tool_goals").select("id, title, target, unit, status")
    .eq("user_id", viewer.id).eq("horizon", view).neq("status", "abandoned")
    .lte("start_date", today).gte("deadline", today).order("created_at").limit(60);
  const saved = (rows ?? []).map((g) => ({ id: g.id as string, title: g.title as string, target: g.target == null ? null : Number(g.target), unit: g.unit as string | null, done: g.status === "completed" }));
  return (
    <>
      <PageHeader title={view === "weekly" ? "Weekly goals" : "Daily goals"} />
      <GoalTabs view={view} />
      <div className="max-w-3xl"><PeriodGoals period={view} saved={saved} /></div>
    </>
  );
}
