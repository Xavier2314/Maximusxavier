import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Building2, CircleCheck, MapPinOff, Users } from "lucide-react";
import { AttendanceBadge } from "@/components/attendance-badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Attendance } from "@/lib/types";
import { formatTime, todayIn } from "@/lib/utils";
import { LiveRefresh } from "./live-refresh";

export const metadata = { title: "Live office board" };

type Row = Attendance & { profiles: { full_name: string; avatar_url: string | null; member_id: string } | null };

export default async function LiveBoardPage() {
  const viewer = await requireViewer();
  if (!viewer.can("manage_office") && !viewer.can("approve_attendance_exceptions") && !viewer.isAdmin) redirect("/forbidden");
  const supabase = await createClient();
  const today = todayIn(viewer.profile.timezone);

  // RLS returns only offices/records this person may see.
  const [{ data: offices }, { data: rows }] = await Promise.all([
    supabase.from("offices").select("id, name, radius_m").eq("is_active", true).order("name"),
    supabase.from("attendance").select("*, profiles!attendance_user_id_fkey(full_name, avatar_url, member_id)")
      .eq("attendance_date", today).order("check_in_at", { ascending: false }).returns<Row[]>(),
  ]);
  const records = rows ?? [];

  return (
    <>
      <Link href="/attendance" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Attendance
      </Link>
      <PageHeader eyebrow="Live" title="Office board" description="Presence is based on verified check-in and check-out events today."
        action={<LiveRefresh />} />

      {(offices ?? []).length === 0 ? (
        <Card><EmptyState icon={<Building2 className="size-6" />} title="No offices to show" description="You don't manage any active offices yet." /></Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {(offices ?? []).map((o) => {
            const list = records.filter((r) => r.office_id === o.id);
            const present = list.filter((r) => !r.check_out_at && ["verified_in_office", "approved_exception"].includes(r.status));
            const flagged = list.filter((r) => ["outside_radius", "location_unavailable", "pending_review"].includes(r.status));
            return (
              <Card key={o.id as string}>
                <CardHeader title={o.name as string} icon={<Building2 className="size-4" />}
                  description={`${list.length} check-ins today · radius ${o.radius_m} m`}
                  action={<Badge tone="green"><CircleCheck className="size-3" aria-hidden /> {present.length} present</Badge>} />
                <CardBody className="pt-3">
                  {list.length === 0 ? (
                    <p className="py-8 text-center text-sm text-fg-muted">Nobody has checked in yet today.</p>
                  ) : (
                    <ul className="divide-y divide-border">
                      {list.map((r) => (
                        <li key={r.id} className="flex items-center gap-3 py-2.5">
                          <Avatar name={r.profiles?.full_name ?? "Member"} src={r.profiles?.avatar_url} size={34} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{r.profiles?.full_name}</p>
                            <p className="text-xs text-fg-subtle">
                              In {formatTime(r.check_in_at)}{r.check_out_at ? ` · Out ${formatTime(r.check_out_at)}` : ""}
                              {r.check_in_distance_m != null && ` · ${Math.round(r.check_in_distance_m)} m`}
                            </p>
                          </div>
                          <AttendanceBadge status={r.status} checkedOut={Boolean(r.check_out_at)} />
                        </li>
                      ))}
                    </ul>
                  )}
                  {flagged.length > 0 && (
                    <p className="mt-3 flex items-center gap-2 rounded-xl bg-warning-soft p-3 text-xs text-warning">
                      <MapPinOff className="size-4" aria-hidden /> {flagged.length} check-in{flagged.length > 1 ? "s" : ""} need attention. Members can submit corrections for your review.
                    </p>
                  )}
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
      <p className="mt-6 flex items-center gap-2 text-xs text-fg-subtle"><Users className="size-3.5" aria-hidden /> GPS matches indicate the reported device location was within the radius; they do not prove physical presence.</p>
    </>
  );
}
