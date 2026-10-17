import { CircleCheck, CircleHelp, CircleX, Clock, LogOut, MapPinOff, ShieldCheck } from "lucide-react";
import { Badge, type Tone } from "@/components/ui/misc";
import type { AttendanceStatus } from "@/lib/types";

const MAP: Record<AttendanceStatus, { label: string; tone: Tone; icon: typeof CircleCheck }> = {
  verified_in_office: { label: "Verified in office", tone: "green", icon: CircleCheck },
  outside_radius: { label: "Outside office radius", tone: "amber", icon: MapPinOff },
  location_unavailable: { label: "Location unavailable", tone: "neutral", icon: CircleHelp },
  pending_review: { label: "Pending review", tone: "blue", icon: Clock },
  approved_exception: { label: "Approved by manager", tone: "green", icon: ShieldCheck },
  rejected: { label: "Rejected", tone: "red", icon: CircleX },
};

export const ATTENDANCE_LABELS = Object.fromEntries(Object.entries(MAP).map(([k, v]) => [k, v.label])) as Record<AttendanceStatus, string>;

/** Status is always shown with an icon and a label, never colour alone. */
export function AttendanceBadge({ status, checkedOut }: { status: AttendanceStatus; checkedOut?: boolean }) {
  const s = MAP[status];
  const Icon = s.icon;
  return (
    <span className="inline-flex flex-wrap gap-1">
      <Badge tone={s.tone}><Icon className="size-3" aria-hidden /> {s.label}</Badge>
      {checkedOut && <Badge><LogOut className="size-3" aria-hidden /> Checked out</Badge>}
    </span>
  );
}
