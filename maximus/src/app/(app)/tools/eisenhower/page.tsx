import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { addDays, type Task } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/utils";
import { BackToTools } from "../timer-page";
import { Matrix } from "./matrix";

export const metadata = { title: "Eisenhower matrix" };

export default async function EisenhowerPage() {
  const viewer = await requireViewer();
  const today = todayIn(viewer.profile.timezone);
  const supabase = await createClient();
  const { data } = await supabase.from("tasks").select("*").eq("user_id", viewer.id).is("completed_at", null)
    .order("due_date", { ascending: true, nullsFirst: false }).limit(200).returns<Task[]>();
  const soon = addDays(today, 1);
  const tasks = (data ?? []).map((t) => ({
    id: t.id, title: t.title, due_date: t.due_date,
    important: t.priority === 1, urgent: Boolean(t.due_date && t.due_date <= soon),
  }));
  return (
    <>
      <PageHeader eyebrow="Goals & productivity" title="Eisenhower matrix"
        description="Sort your planner tasks by what's urgent and what's important. Do, schedule, delegate or drop." action={<BackToTools />} />
      <Matrix tasks={tasks} today={today} />
    </>
  );
}
