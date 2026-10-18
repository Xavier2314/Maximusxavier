import { CalendarCheck, CalendarDays, ClipboardList, Flame, History, MonitorDot, QrCode, Send } from "lucide-react";
import { AttendanceBadge } from "@/components/attendance-badge";
import { LinkButton } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Attendance } from "@/lib/types";
import { cn, formatDate, formatTime, monthStart, todayIn } from "@/lib/utils";
import { CheckInPanel } from "./check-in-panel";
import { CorrectionForm } from "./correction-form";

export const metadata = { title: "Attendance" };

export default async function AttendancePage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const tz = viewer.profile.timezone;
  const today = todayIn(tz);

  const [{ data: memberships }, { data: open }, { data: history }, { data: streak }, { data: corrections }] = await Promise.all([
    supabase.from("office_memberships").select("is_manager, offices(id, name, radius_m, is_active)").eq("user_id", viewer.id),
    supabase.from("attendance").select("*").eq("user_id", viewer.id).is("check_out_at", null).maybeSingle<Attendance>(),
    supabase.from("attendance").select("*").eq("user_id", viewer.id).order("check_in_at", { ascending: false }).limit(60).returns<Attendance[]>(),
    supabase.rpc("attendance_streak"),
    supabase.from("attendance_corrections").select("id, requested_date, reason, status, reviewer_note, created_at")
      .eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(5),
  ]);

  const offices = ((memberships ?? []) as unknown as { is_manager: boolean; offices: { id: string; name: string; radius_m: number; is_active: boolean } | null }[])
    .map((m) => m.offices).filter((o): o is { id: string; name: string; radius_m: number; is_active: boolean } => Boolean(o?.is_active));
  const isManager = viewer.can("manage_office") || viewer.can("approve_attendance_exceptions");
  const month = monthStart(today);
  const presentDays = new Set((history ?? []).filter((a) => a.attendance_date >= month && ["verified_in_office", "approved_exception"].includes(a.status)).map((a) => a.attendance_date));

  // Calendar for the current month.
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const firstDow = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7; // Monday-first

  return (
    <>
      <PageHeader eyebrow="Attendance" title="Office attendance" description="Check in when you arrive, check out when you leave."
        action={<>
          {(isManager || viewer.isLeader) && <LinkButton href="/attendance/register" variant="outline" size="sm"><ClipboardList className="size-4" aria-hidden /> Register</LinkButton>}
          {isManager && <LinkButton href="/attendance/live" variant="outline" size="sm"><MonitorDot className="size-4" aria-hidden /> Live office board</LinkButton>}
        </>} />
      <p className="-mt-3 mb-6 flex items-center gap-2 text-sm text-fg-muted"><QrCode className="size-4 shrink-0" aria-hidden />At the office? Just scan the QR poster on the wall with your phone camera.</p>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="hero-gradient relative overflow-hidden rounded-[1.75rem] p-6 text-white lg:col-span-2" aria-label="Check in">
          <div className="wedge absolute -right-8 -top-6 h-[74px] w-[100px] scale-[2] bg-brand-green/20" aria-hidden />
          <p className="text-sm text-white/70">{formatDate(today, { weekday: "long", day: "numeric", month: "long" }, tz)}</p>
          <h2 className="mt-1 text-2xl font-bold">{open ? "You're at work 💪" : "Ready to start your day?"}</h2>
          <div className="relative mt-5">
            <CheckInPanel offices={offices} open={open ?? null} />
          </div>
        </section>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-1">
          <StatCard label="Current streak" value={`${(streak as number | null) ?? 0} days`} icon={<Flame className="size-4" />} tone="lime" hint="Consecutive working days" />
          <StatCard label="Days this month" value={presentDays.size} icon={<CalendarCheck className="size-4" />} tone="green" hint="Verified or approved" />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader title={formatDate(month, { month: "long", year: "numeric" })} icon={<CalendarDays className="size-4" />} />
          <CardBody>
            <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
              {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => <span key={i} className="pb-1 font-medium text-fg-subtle" aria-hidden>{d}</span>)}
              {Array.from({ length: firstDow }).map((_, i) => <span key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }, (_, i) => {
                const d = `${month.slice(0, 8)}${String(i + 1).padStart(2, "0")}`;
                const present = presentDays.has(d);
                const isToday = d === today;
                return (
                  <span key={d} className={cn("grid aspect-square place-items-center rounded-lg text-sm tabular-nums",
                    present ? "bg-brand-green font-semibold text-brand-navy" : d > today ? "text-fg-subtle/60" : "bg-surface-muted text-fg-muted",
                    isToday && "ring-2 ring-primary")}
                    aria-label={`${formatDate(d, { day: "numeric", month: "long" })}${present ? ", attended" : ""}`}>
                    {i + 1}
                  </span>
                );
              })}
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-fg-subtle"><span className="size-3 rounded bg-brand-green" aria-hidden /> Verified or approved attendance</p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="History" icon={<History className="size-4" />} />
          <CardBody className="pt-2">
            {history && history.length > 0 ? (
              <ul className="divide-y divide-border">
                {history.slice(0, 15).map((a) => (
                  <li key={a.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm font-medium">{formatDate(a.attendance_date, { weekday: "short", day: "numeric", month: "short" })}</p>
                      <p className="text-xs text-fg-subtle">
                        {formatTime(a.check_in_at, tz)} – {a.check_out_at ? formatTime(a.check_out_at, tz) : "still checked in"}
                        {a.check_in_distance_m != null && ` · ${Math.round(a.check_in_distance_m)} m from office`}
                        {a.check_in_accuracy_m != null && ` (±${Math.round(a.check_in_accuracy_m)} m)`}
                        {a.method !== "gps" && ` · ${a.method}`}
                      </p>
                    </div>
                    <AttendanceBadge status={a.status} checkedOut={Boolean(a.check_out_at)} />
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={<CalendarCheck className="size-6" />} title="No check-ins yet" description="Your attendance history will appear here." />
            )}
          </CardBody>
        </Card>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Request a correction" icon={<Send className="size-4" />}
            description="Forgot to check in, or your location didn't work? Your office manager will review it." />
          <CardBody>
            {offices.length > 0 ? <CorrectionForm offices={offices} today={today} /> : <p className="text-sm text-fg-muted">You need an office assignment first.</p>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Your requests" icon={<History className="size-4" />} />
          <CardBody className="pt-2">
            {corrections && corrections.length > 0 ? (
              <ul className="divide-y divide-border">
                {corrections.map((c) => (
                  <li key={c.id as string} className="py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{formatDate(c.requested_date as string)}</p>
                      <Badge tone={c.status === "approved" ? "green" : c.status === "rejected" ? "red" : "blue"}>{String(c.status)}</Badge>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-fg-muted">{c.reason as string}</p>
                    {c.reviewer_note && <p className="mt-1 text-xs text-fg-subtle">Manager: {c.reviewer_note as string}</p>}
                  </li>
                ))}
              </ul>
            ) : <p className="py-6 text-center text-sm text-fg-muted">No correction requests.</p>}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
