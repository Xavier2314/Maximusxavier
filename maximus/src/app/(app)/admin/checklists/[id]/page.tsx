import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Avatar } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { formatMinutes, isRunning, workedSeconds, type ChecklistItem, type ItemProgress } from "@/lib/checklists";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { ChecklistControls } from "./controls";

export const metadata = { title: "Checklist progress" };
export const dynamic = "force-dynamic";

type Person = { user_id: string; profiles: { full_name: string; avatar_url: string | null } | null };

/** Who has finished, who is working and on what, who is running late, and who hasn't started. */
export default async function ChecklistProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("super_admin")) redirect("/forbidden");
  const { id } = await params;
  const supabase = await createClient();
  const { data: list } = await supabase.from("pushed_checklists").select("id, title, due_at, created_at").eq("id", id).maybeSingle();
  if (!list) notFound();
  const [{ data: itemRows }, { data: people }] = await Promise.all([
    supabase.from("pushed_checklist_items").select("*").eq("checklist_id", id).order("position").returns<ChecklistItem[]>(),
    supabase.from("pushed_checklist_recipients").select("user_id, profiles(full_name, avatar_url)").eq("checklist_id", id).returns<Person[]>(),
  ]);
  const items = itemRows ?? [];
  const { data: progRows } = items.length
    ? await supabase.from("pushed_checklist_progress").select("*").in("item_id", items.map((i) => i.id)).returns<ItemProgress[]>()
    : { data: [] as ItemProgress[] };
  const progress = progRows ?? [];
  const now = Date.now();
  const pastDue = Boolean(list.due_at && Date.parse(list.due_at) < now);

  const rows = (people ?? []).map((p) => {
    const mine = (itemId: string) => progress.find((x) => x.item_id === itemId && x.user_id === p.user_id);
    const done = items.filter((i) => mine(i.id)?.completed_at).length;
    const running = items.find((i) => isRunning(mine(i.id)));
    const runningLeft = running ? running.minutes * 60 - workedSeconds(mine(running.id), now) : 0;
    const lastDone = items.map((i) => mine(i.id)?.completed_at).filter(Boolean).sort().at(-1);
    const started = items.some((i) => mine(i.id)?.started_at);
    const finished = items.length > 0 && done === items.length;
    const late = !finished && ((running && runningLeft < 0) || pastDue);
    const status = finished ? `Finished at ${formatTime(lastDone!, viewer.profile.timezone)}`
      : running ? (runningLeft < 0 ? `On "${running.title}", ${Math.ceil(-runningLeft / 60)} min over` : `On "${running.title}", ${Math.ceil(runningLeft / 60)} min left`)
      : started ? (pastDue ? "Paused, past the due time" : "Paused") : pastDue ? "Not started, past the due time" : "Not started";
    return { ...p, done, finished, started, working: Boolean(running), late, status };
  }).sort((a, b) => Number(a.finished) - Number(b.finished) || b.done - a.done);

  const finished = rows.filter((r) => r.finished).length;
  const working = rows.filter((r) => !r.finished && r.started).length;
  const notStarted = rows.length - finished - working;

  return (
    <>
      <Link href="/admin/checklists" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Checklists</Link>
      <p className="text-sm text-fg-muted">
        Pushed {formatDate(list.created_at, { weekday: "short", day: "numeric", month: "short" })} to {rows.length} {rows.length === 1 ? "person" : "people"}
        {list.due_at ? `, due ${formatDate(list.due_at, { weekday: "short", day: "numeric", month: "short" })} at ${formatTime(list.due_at, viewer.profile.timezone)}` : ""}
      </p>
      <h1 className="mt-1 text-[34px] leading-none tracking-[-0.03em] sm:text-[40px]">{list.title}</h1>

      <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_1.6fr] lg:items-start">
        <section className="space-y-3">
          <div className="grid grid-cols-3 gap-2.5">
            {[["Finished", finished], ["Working", working], ["Not started", notStarted]].map(([label, n]) => (
              <div key={label as string} className="rounded-[18px] bg-surface p-4">
                <span className="block font-display text-[32px] leading-none tabular-nums">{n}</span>
                <span className="mt-1 block text-sm text-fg-muted">{label}</span>
              </div>
            ))}
          </div>
          <div className="rounded-[22px] bg-surface p-5">
            <h2 className="text-lg">{items.length} items, {formatMinutes(items.reduce((s, i) => s + i.minutes, 0))}</h2>
            <ol className="mt-3 space-y-2">
              {items.map((i, n) => (
                <li key={i.id} className="flex gap-3 text-sm">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-fg text-xs font-semibold text-bg tabular-nums">{n + 1}</span>
                  <span className="min-w-0 flex-1 pt-0.5">{i.title}</span>
                  <span className="shrink-0 pt-0.5 text-fg-muted">{formatMinutes(i.minutes)}</span>
                </li>
              ))}
            </ol>
          </div>
          <ChecklistControls id={id} waiting={rows.length - finished} />
        </section>

        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.user_id} className="flex items-center gap-3 rounded-[18px] bg-surface p-3.5">
              <Avatar name={r.profiles?.full_name ?? "Member"} src={r.profiles?.avatar_url} size={38} className="ring-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="truncate font-medium">{r.profiles?.full_name ?? "Member"}</span>
                  <span className="shrink-0 text-sm text-fg-muted tabular-nums">{r.done} of {items.length}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-bg">
                  <div className={cn("h-1.5 rounded-full", r.finished ? "bg-tile-green" : "bg-brand-blue")} style={{ width: `${items.length ? (r.done / items.length) * 100 : 0}%` }} />
                </div>
                <p className={cn("mt-1 truncate text-sm", r.late ? "text-danger" : "text-fg-muted")}>{r.status}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
