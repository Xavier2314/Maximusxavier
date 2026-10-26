import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Download, FileText, Plus } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { weekStartOf } from "@/lib/office-report";
import { addDays } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelative, todayIn } from "@/lib/utils";
import { OfficePicker } from "../office-picker";

export const metadata = { title: "Weekly office reports" };

export default async function WeeklyReportsPage({ searchParams }: { searchParams: Promise<{ office?: string }> }) {
  const viewer = await requireViewer();
  if (viewer.offices.length === 0) redirect("/forbidden");
  const { office } = await searchParams;
  const officeId = viewer.offices.find((o) => o.id === office)?.id
    ?? viewer.offices.find((o) => o.id === viewer.profile.office_id)?.id ?? viewer.offices[0].id;
  const thisWeek = weekStartOf(todayIn(viewer.profile.timezone));
  const supabase = await createClient();
  const { data } = await supabase.from("office_reports").select("id, week_start, status, submitted_at, updated_at")
    .eq("office_id", officeId).order("week_start", { ascending: false }).limit(52);
  const reports = (data ?? []) as { id: string; week_start: string; status: string; submitted_at: string | null; updated_at: string }[];
  const hasThisWeek = reports.some((r) => r.week_start === thisWeek);

  return (
    <>
      <PageHeader eyebrow="Office view" title="Weekly office reports"
        description="Talk to Maximus AI or fill the table. Last week's numbers carry over, and you can download a PDF with your office logo."
        action={<>
          <OfficePicker offices={viewer.offices} current={officeId} />
          <LinkButton href={`/office/weekly/${thisWeek}?office=${officeId}`}>
            <Plus className="size-4" aria-hidden />{hasThisWeek ? "Open this week's report" : "Start this week's report"}
          </LinkButton>
        </>} />
      {reports.length === 0 ? (
        <Card><EmptyState icon={<FileText className="size-6" />} title="No reports yet"
          description="Start this week's report. It takes a few minutes, especially if you just talk to Maximus AI." /></Card>
      ) : (
        <Card className="divide-y divide-border">
          {reports.map((r) => (
            <div key={r.id} className="flex items-center gap-3 p-4">
              <Link href={`/office/weekly/${r.week_start}?office=${officeId}`} className="flex min-w-0 flex-1 items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><FileText className="size-5" aria-hidden /></span>
                <span className="min-w-0">
                  <span className="block font-medium">Week of {formatDate(r.week_start, { day: "numeric", month: "short" })} – {formatDate(addDays(r.week_start, 6), { day: "numeric", month: "short", year: "numeric" })}</span>
                  <span className="text-xs text-fg-subtle">{r.submitted_at ? `Submitted ${formatRelative(r.submitted_at)}` : `Draft, edited ${formatRelative(r.updated_at)}`}</span>
                </span>
              </Link>
              <Badge tone={r.status === "submitted" ? "green" : "neutral"}>{r.status === "submitted" ? "Submitted" : "Draft"}</Badge>
              <a href={`/print/office-report/${r.id}`} target="_blank" rel="noopener noreferrer" aria-label="Download PDF"
                className="grid size-11 place-items-center rounded-xl text-fg-muted hover:bg-surface-muted hover:text-fg"><Download className="size-4" aria-hidden /></a>
              <ChevronRight className="size-4 text-fg-subtle" aria-hidden />
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
