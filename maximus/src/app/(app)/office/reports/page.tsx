import Link from "next/link";
import { redirect } from "next/navigation";
import { CalendarCheck, Clock, Download, TriangleAlert, UserX, Users } from "lucide-react";
import { TrendBars } from "@/components/charts";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader, Progress, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { RANGES, resolveRange, type AttendanceRow } from "@/lib/reports";
import { createClient } from "@/lib/supabase/server";
import { cn, formatDate, formatRelative, todayIn } from "@/lib/utils";
import { OfficePicker } from "../office-picker";
import { PrintButton } from "./print-button";

export const metadata = { title: "Attendance reports" };

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "streak", label: "Absent 5+ days in a row" },
  { key: "late", label: "Often late (3+)" },
  { key: "low", label: "Below 50%" },
  { key: "quiet7", label: "Quiet 7+ days" },
  { key: "quiet14", label: "Quiet 14+ days" },
] as const;
const DAY = 864e5;

export default async function AttendanceReportsPage({ searchParams }: {
  searchParams: Promise<{ office?: string; range?: string; from?: string; to?: string; filter?: string }>;
}) {
  const viewer = await requireViewer();
  if (viewer.offices.length === 0) redirect("/forbidden");
  const sp = await searchParams;
  const officeId = viewer.offices.find((o) => o.id === sp.office)?.id
    ?? viewer.offices.find((o) => o.id === viewer.profile.office_id)?.id ?? viewer.offices[0].id;
  const officeName = viewer.offices.find((o) => o.id === officeId)?.name ?? "Office";
  const today = todayIn(viewer.profile.timezone);
  const range = resolveRange(today, sp.range, sp.from, sp.to);
  const filter = FILTERS.find((f) => f.key === sp.filter)?.key ?? "all";

  const supabase = await createClient();
  const [{ data: report, error }, { data: daily }] = await Promise.all([
    supabase.rpc("attendance_report", { p_office: officeId, p_from: range.from, p_to: range.to }),
    supabase.rpc("attendance_daily", { p_office: officeId, p_from: range.from, p_to: range.to }),
  ]);
  const rows = (report as AttendanceRow[] | null) ?? [];
  const now = Date.now();
  const quietFor = (r: AttendanceRow) => (r.last_activity ? (now - new Date(r.last_activity).getTime()) / DAY : Infinity);
  const shown = rows.filter((r) =>
    filter === "streak" ? r.absent_streak >= 5
    : filter === "late" ? r.late_days >= 3
    : filter === "low" ? r.attendance_pct !== null && r.attendance_pct < 50
    : filter === "quiet7" ? quietFor(r) >= 7
    : filter === "quiet14" ? quietFor(r) >= 14
    : true);

  const totalOpen = rows.reduce((a, r) => a + r.open_days, 0);
  const totalPresent = rows.reduce((a, r) => a + r.present_days, 0);
  const totalLate = rows.reduce((a, r) => a + r.late_days, 0);
  const avg = totalOpen ? Math.round((100 * totalPresent) / totalOpen) : null;
  const chart = ((daily as { day: string; present: number; late: number; absent: number }[] | null) ?? []).map((d) => ({
    day: formatDate(d.day, { day: "numeric", month: "short" }), onTime: d.present - d.late, late: d.late,
  }));
  const qs = (p: Record<string, string>) => {
    const base: Record<string, string> = { office: officeId, ...(range.key === "custom" ? { from: range.from, to: range.to } : { range: range.key }), filter };
    return `/office/reports?${new URLSearchParams({ ...base, ...p })}`;
  };
  const csv = `/api/export/attendance?${new URLSearchParams({ office: officeId, from: range.from, to: range.to })}`;

  return (
    <>
      <PageHeader eyebrow="Office view" title="Attendance reports"
        description={`${officeName} · ${formatDate(range.from, { day: "numeric", month: "short" })} – ${formatDate(range.to, { day: "numeric", month: "short", year: "numeric" })}`}
        action={<div className="no-print flex flex-wrap gap-2">
          <OfficePicker offices={viewer.offices} current={officeId} />
          <LinkButton href={csv} variant="outline" size="sm" prefetch={false}><Download className="size-4" aria-hidden />CSV</LinkButton>
          <PrintButton />
        </div>} />

      <div className="no-print mb-6 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <nav aria-label="Date range" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {RANGES.map((r) => (
            <Link key={r.key} href={`/office/reports?${new URLSearchParams({ office: officeId, range: r.key, filter })}`} aria-current={range.key === r.key ? "page" : undefined}
              className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", range.key === r.key ? "border-primary bg-primary-soft font-medium text-primary" : "border-border text-fg-muted hover:text-fg")}>
              {r.label}
            </Link>
          ))}
        </nav>
        <form action="/office/reports" className="flex flex-wrap items-center gap-2 text-sm">
          <input type="hidden" name="office" value={officeId} />
          <input type="hidden" name="filter" value={filter} />
          <label className="sr-only" htmlFor="from">From</label>
          <input id="from" type="date" name="from" defaultValue={range.from} max={today} className="h-9 rounded-xl border border-border bg-surface px-2" />
          <span className="text-fg-subtle">to</span>
          <label className="sr-only" htmlFor="to">To</label>
          <input id="to" type="date" name="to" defaultValue={range.to} max={today} className="h-9 rounded-xl border border-border bg-surface px-2" />
          <button className="h-9 rounded-xl bg-primary px-3 font-medium text-primary-fg">Apply</button>
        </form>
      </div>

      {error ? (
        <Card><EmptyState icon={<TriangleAlert className="size-6" />} title="Couldn't build this report" description={error.message} /></Card>
      ) : (
        <>
          <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4" aria-label="Summary">
            <StatCard label="Average attendance" value={avg === null ? "—" : `${avg}%`} hint="Present ÷ open days, per member" icon={<CalendarCheck className="size-4" />} />
            <StatCard label="Check-ins" value={totalPresent} hint={`${totalLate} of them late`} icon={<Users className="size-4" />} tone="green" />
            <StatCard label="Absent 5+ days in a row" value={rows.filter((r) => r.absent_streak >= 5).length} hint="Right now" icon={<UserX className="size-4" />} tone="lime" />
            <StatCard label="Often late" value={rows.filter((r) => r.late_days >= 3).length} hint="3 or more late days" icon={<Clock className="size-4" />} tone="navy" />
          </section>

          <Card className="mb-6">
            <CardHeader title="Check-ins per open day" icon={<CalendarCheck className="size-4" />} description="On time and late" />
            <CardBody>
              {chart.some((d) => d.onTime + d.late > 0)
                ? <TrendBars data={chart} xKey="day" series={[{ key: "onTime", label: "On time" }, { key: "late", label: "Late", color: "2" }]} caption="Check-ins per open day" />
                : <EmptyState icon={<CalendarCheck className="size-6" />} title="No check-ins in this period" />}
            </CardBody>
          </Card>

          <nav aria-label="Filter members" className="no-print scrollbar-none -mx-4 mb-3 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            {FILTERS.map((f) => (
              <Link key={f.key} href={qs({ filter: f.key })} aria-current={filter === f.key ? "page" : undefined}
                className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", filter === f.key ? "border-primary bg-primary-soft font-medium text-primary" : "border-border text-fg-muted hover:text-fg")}>
                {f.label}
              </Link>
            ))}
          </nav>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b border-border bg-surface-muted/50 text-left text-xs uppercase tracking-wide text-fg-subtle">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Member</th>
                    <th scope="col" className="w-48 px-4 py-3 font-medium">Attendance</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Present</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Late</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Absent</th>
                    <th scope="col" className="px-4 py-3 text-right font-medium">Missed in a row</th>
                    <th scope="col" className="px-4 py-3 font-medium">Last check-in</th>
                    <th scope="col" className="px-4 py-3 font-medium">Last active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {shown.map((r) => (
                    <tr key={r.member} className="hover:bg-surface-muted/40">
                      <td className="px-4 py-3">
                        <Link href={`/team/${r.member}?view=office`} className="flex items-center gap-3">
                          <Avatar name={r.full_name} src={r.avatar_url} size={32} />
                          <span><span className="block font-medium hover:text-primary">{r.full_name}</span><span className="text-xs text-fg-subtle">{r.member_code}</span></span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {r.attendance_pct === null ? <span className="text-fg-subtle">No open days</span> : (
                          <div className="flex items-center gap-2">
                            <Progress value={r.attendance_pct} tone={r.attendance_pct >= 75 ? "green" : "blue"} label={`${r.full_name} attendance`} className="h-2" />
                            <span className={cn("w-10 text-right font-semibold tabular-nums", r.attendance_pct < 50 && "text-warning")}>{r.attendance_pct}%</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.present_days}<span className="text-fg-subtle">/{r.open_days}</span></td>
                      <td className={cn("px-4 py-3 text-right tabular-nums", r.late_days >= 3 && "font-semibold text-warning")}>{r.late_days}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.absent_days}</td>
                      <td className={cn("px-4 py-3 text-right tabular-nums", r.absent_streak >= 5 ? "font-semibold text-danger" : r.absent_streak >= 3 && "text-warning")}>{r.absent_streak}</td>
                      <td className="px-4 py-3 text-fg-muted">{r.last_check_in ? formatRelative(r.last_check_in) : "Never"}</td>
                      <td className="px-4 py-3 text-fg-muted">{r.last_activity ? formatRelative(r.last_activity) : "No activity yet"}</td>
                    </tr>
                  ))}
                  {shown.length === 0 && <tr><td colSpan={8} className="px-4 py-10 text-center text-fg-muted">No members match this filter.</td></tr>}
                </tbody>
              </table>
            </div>
          </Card>
          <p className="mt-4 text-xs text-fg-subtle">
            Open days are days the office has opening hours, counted from when each member joined; today counts once they check in.
            Present = a verified or approved check-in. Late = after opening time plus the office&apos;s grace minutes.
            Missed in a row = open days since their last check-in. Active = any check-in, evaluation, order or prospect update.
          </p>
        </>
      )}
    </>
  );
}
