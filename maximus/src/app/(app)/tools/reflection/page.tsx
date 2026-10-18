import Link from "next/link";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { addDays } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { MOODS, elapsedSeconds, fmtMinutes, type FocusSession } from "@/lib/tools";
import { cn, formatDate, todayIn } from "@/lib/utils";
import { BackToTools } from "../timer-page";
import { JournalForm, type Entry } from "./journal-form";

export const metadata = { title: "Reflection & journal" };

export default async function ReflectionPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await requireViewer();
  const { tab: rawTab } = await searchParams;
  const tab = rawTab === "journal" ? "journal" : "reflection";
  const today = todayIn(viewer.profile.timezone);
  const dow = new Date(`${today}T12:00:00Z`).getUTCDay() || 7;
  const weekStart = addDays(today, 1 - dow);
  const entryDate = tab === "reflection" ? weekStart : today;
  const supabase = await createClient();
  const [{ data: entries }, { data: sessions }, { count: tasksDone }, { count: habitTicks }] = await Promise.all([
    supabase.from("journal_entries").select("*").eq("user_id", viewer.id).eq("kind", tab).order("entry_date", { ascending: false }).limit(30).returns<Entry[]>(),
    supabase.from("focus_sessions").select("*").eq("user_id", viewer.id).eq("status", "completed").neq("kind", "break").gte("started_at", `${weekStart}T00:00:00`).returns<FocusSession[]>(),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("user_id", viewer.id).gte("completed_at", `${weekStart}T00:00:00`),
    supabase.from("habit_checks").select("habit_id", { count: "exact", head: true }).eq("user_id", viewer.id).gte("check_date", weekStart),
  ]);
  const current = (entries ?? []).find((e) => e.entry_date === entryDate) ?? null;
  const past = (entries ?? []).filter((e) => e.entry_date !== entryDate);
  const focus = (sessions ?? []).reduce((a, s) => a + elapsedSeconds(s) / 60, 0);

  return (
    <>
      <PageHeader eyebrow="Goals & productivity" title="Reflection & journal" description="Private to you. Nobody else, not even admins, can read these." action={<BackToTools />} />
      <div className="mb-4 flex gap-2">
        {[{ k: "reflection", l: "Weekly reflection" }, { k: "journal", l: "Daily journal" }].map((t) => (
          <Link key={t.k} href={`/tools/reflection?tab=${t.k}`} className={cn("rounded-full px-3 py-1 text-sm", tab === t.k ? "bg-primary text-primary-fg" : "bg-surface-muted")}>{t.l}</Link>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title={tab === "reflection" ? `Week of ${formatDate(weekStart, { day: "numeric", month: "long" })}` : formatDate(today, { weekday: "long", day: "numeric", month: "long" })}
            description={tab === "reflection" ? `So far this week: ${fmtMinutes(focus)} focused, ${tasksDone ?? 0} tasks done, ${habitTicks ?? 0} habit ticks.` : "How did today go?"} />
          <CardBody><JournalForm key={`${tab}-${entryDate}`} kind={tab} entryDate={entryDate} entry={current} /></CardBody>
        </Card>
        <Card className="h-fit">
          <CardHeader title="Earlier entries" />
          <CardBody className="space-y-3">
            {past.length === 0 ? <p className="text-sm text-fg-muted">Nothing yet.</p> : past.map((e) => (
              <details key={e.id} className="rounded-xl bg-surface-muted px-3 py-2 text-sm">
                <summary className="cursor-pointer font-medium">
                  {e.mood ? `${MOODS[e.mood - 1].emoji} ` : ""}{formatDate(e.entry_date, { day: "numeric", month: "short", year: "numeric" })}
                </summary>
                <div className="mt-2 space-y-1.5 whitespace-pre-line text-fg-muted">
                  {e.wins && <p><b className="text-fg">Wins:</b> {e.wins}</p>}
                  {e.challenges && <p><b className="text-fg">Challenges:</b> {e.challenges}</p>}
                  {e.lessons && <p><b className="text-fg">Lessons:</b> {e.lessons}</p>}
                  {e.next_focus && <p><b className="text-fg">Next focus:</b> {e.next_focus}</p>}
                  {e.body && <p>{e.body}</p>}
                </div>
              </details>
            ))}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
