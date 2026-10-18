import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { todayIn } from "@/lib/utils";
import { BackToTools } from "../timer-page";
import { BlockPlanner, type Block } from "./block-planner";

export const metadata = { title: "Time blocking" };

export default async function TimeBlocksPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const viewer = await requireViewer();
  const { date: raw } = await searchParams;
  const today = todayIn(viewer.profile.timezone);
  const date = raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : today;
  const supabase = await createClient();
  const { data } = await supabase.from("time_blocks").select("id, block_date, start_min, end_min, title, category, done")
    .eq("user_id", viewer.id).eq("block_date", date).order("start_min");
  return (
    <>
      <PageHeader eyebrow="Focus & time" title="Time blocking" description="Give every hour a job. Drag blocks to move them, drag the bottom edge to resize." action={<BackToTools />} />
      <BlockPlanner key={date} date={date} today={today} blocks={(data ?? []) as Block[]} />
    </>
  );
}
