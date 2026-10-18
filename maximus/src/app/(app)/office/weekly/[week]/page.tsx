import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { weekStartOf, type OfficeReport } from "@/lib/office-report";
import { addDays } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { ReportEditor } from "../report-editor";

export const metadata = { title: "Weekly office report" };

export default async function WeeklyReportPage({ params, searchParams }: { params: Promise<{ week: string }>; searchParams: Promise<{ office?: string }> }) {
  const viewer = await requireViewer();
  if (viewer.offices.length === 0) redirect("/forbidden");
  const [{ week }, { office }] = await Promise.all([params, searchParams]);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(week)) notFound();
  const weekStart = weekStartOf(week);
  if (weekStart !== week) redirect(`/office/weekly/${weekStart}${office ? `?office=${office}` : ""}`);
  const officeId = viewer.offices.find((o) => o.id === office)?.id
    ?? viewer.offices.find((o) => o.id === viewer.profile.office_id)?.id ?? viewer.offices[0].id;
  const officeName = viewer.offices.find((o) => o.id === officeId)?.name ?? "Office";

  const supabase = await createClient();
  const [{ data: rows }, { data: facts }, { data: ranks }, { data: managers }, { data: officeRow }] = await Promise.all([
    supabase.from("office_reports").select("*").eq("office_id", officeId).lte("week_start", weekStart)
      .gte("week_start", addDays(weekStart, -21)).order("week_start", { ascending: false }).returns<(OfficeReport & { id: string })[]>(),
    supabase.rpc("office_week_facts", { p_office: officeId, p_week_start: weekStart }),
    supabase.rpc("office_rank_counts", { p_office: officeId }),
    supabase.from("office_memberships").select("profiles(full_name)").eq("office_id", officeId).eq("is_manager", true),
    supabase.from("offices").select("address").eq("id", officeId).maybeSingle(),
  ]);
  const reports = rows ?? [];
  const current = reports.find((r) => r.week_start === weekStart);
  const last = reports.find((r) => r.week_start === addDays(weekStart, -7));
  const before = reports.find((r) => r.week_start === addDays(weekStart, -14));
  const previous = reports.find((r) => r.week_start < weekStart);
  const f = (facts ?? {}) as Record<string, number | null>;
  const rk = (ranks ?? {}) as Record<string, number>;
  const managerNames = ((managers ?? []) as unknown as { profiles: { full_name: string } | null }[]).map((m) => m.profiles?.full_name).filter(Boolean).join(" & ");

  // New report: carry the slow-changing numbers over and fill what the app already knows.
  const initial: OfficeReport = current ?? {
    office_id: officeId, week_start: weekStart,
    team_leaders: previous?.team_leaders ?? (managerNames || null),
    director: previous?.director ?? null,
    location: previous?.location ?? ((officeRow?.address as string | null) ?? null),
    currency: previous?.currency ?? "USD",
    metrics: {
      ...(previous?.metrics ?? {}),
      active_members: f.active_members ?? null,
      avg_attendance: f.avg_attendance ?? null,
      ...(rk.newbie ? { newbies: rk.newbie } : {}),
      ...(rk.distributor ? { distributors: rk.distributor } : {}),
      ...(rk.manager ? { managers: rk.manager } : {}),
      ...(rk.senior_manager ? { senior_managers: rk.senior_manager } : {}),
      ...(rk.executive_manager ? { executive_managers: rk.executive_manager } : {}),
      ...(f.orders ? { orders: f.orders } : { orders: null }),
      ...((previous?.currency ?? "USD") === "NGN" && f.amount_earned_ngn ? { amount_earned: f.amount_earned_ngn } : { amount_earned: null }),
      earners_newbies: null, earners_probies: null, earners_distributors: null,
    },
    services: previous?.services ?? [], new_services: [],
    trainings_count: null, training_topics: null, timetable: previous?.timetable ?? null, fresh_updates: null,
    challenges: [], notes: null,
  };

  return (
    <>
      <Link href={`/office/weekly?office=${officeId}`} className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Weekly reports
      </Link>
      <PageHeader eyebrow={officeName} title="Weekly office report"
        description={`Week of ${formatDate(weekStart, { day: "numeric", month: "long" })} – ${formatDate(addDays(weekStart, 6), { day: "numeric", month: "long", year: "numeric" })}`} />
      <ReportEditor key={`${officeId}-${weekStart}`} initial={initial} reportId={current?.id}
        prev={{ last: last?.metrics ?? null, before: before?.metrics ?? null }} />
    </>
  );
}
