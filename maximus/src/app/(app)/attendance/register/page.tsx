import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/form";
import { Avatar, Badge, EmptyState, PageHeader, StatCard } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatTime, todayIn } from "@/lib/utils";
import { MarkPresent } from "./mark-present";

export const metadata = { title: "Office register" };

type Row = { member: string; full_name: string; member_code: string; avatar_url: string | null; check_in_at: string | null; check_out_at: string | null; status: string; minutes_late: number | null };

const STATUS: Record<string, { label: string; tone: "green" | "amber" | "red" | "neutral" | "blue" }> = {
  on_time: { label: "On time", tone: "green" },
  present: { label: "Present", tone: "green" },
  late: { label: "Late", tone: "amber" },
  absent: { label: "Absent", tone: "red" },
  pending: { label: "Needs review", tone: "blue" },
  not_verified: { label: "Not verified", tone: "red" },
  off_day: { label: "Office closed", tone: "neutral" },
};

/** Who came early, late or not at all, for today or any past day. */
export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ office?: string; date?: string }> }) {
  const viewer = await requireViewer();
  if (!viewer.isLeader && !viewer.can("manage_office")) redirect("/forbidden");
  const sp = await searchParams;
  const supabase = await createClient();
  const { data: memberships } = await supabase.from("office_memberships").select("offices(id, name)").eq("user_id", viewer.id);
  const { data: allOffices } = viewer.isAdmin ? await supabase.from("offices").select("id, name").eq("is_active", true).order("name") : { data: null };
  const offices = (allOffices ?? ((memberships ?? []) as unknown as { offices: { id: string; name: string } | null }[]).map((m) => m.offices).filter(Boolean)) as { id: string; name: string }[];
  const office = offices.find((o) => o.id === sp.office) ?? offices[0];
  const date = sp.date && /^\d{4}-\d{2}-\d{2}$/.test(sp.date) ? sp.date : todayIn(viewer.profile.timezone);
  const { data } = office ? await supabase.rpc("office_register", { p_office: office.id, p_date: date }) : { data: [] };
  const rows = (data as Row[] | null) ?? [];
  const count = (s: string[]) => rows.filter((r) => s.includes(r.status)).length;

  return (
    <>
      <PageHeader eyebrow="Attendance" title="Office register" description="Green is on time, yellow is late, red is absent." />
      {!office ? (
        <Card><EmptyState icon={<ClipboardList className="size-6" />} title="No office assigned" description="You need to belong to an office to see its register." /></Card>
      ) : (
        <>
          <form className="mb-6 flex flex-wrap items-end gap-2">
            <div className="flex flex-wrap gap-2">
              {offices.map((o) => (
                <Link key={o.id} href={`/attendance/register?office=${o.id}&date=${date}`}
                  className={cn("rounded-full px-4 py-2 text-sm font-medium", o.id === office.id ? "bg-primary text-primary-fg" : "bg-surface-muted text-fg-muted")}>{o.name}</Link>
              ))}
            </div>
            <input type="hidden" name="office" value={office.id} />
            <Input type="date" name="date" defaultValue={date} max={todayIn(viewer.profile.timezone)} className="w-auto" aria-label="Date" />
            <button className="h-11 rounded-xl border border-border px-4 text-sm font-medium hover:bg-surface-muted">Show</button>
          </form>
          <section className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            <StatCard label="On time" value={count(["on_time", "present"])} icon={<span className="size-3 rounded-full bg-brand-green" />} tone="green" />
            <StatCard label="Late" value={count(["late"])} icon={<span className="size-3 rounded-full bg-[#f59e0b]" />} tone="lime" />
            <StatCard label="Absent" value={count(["absent"])} icon={<span className="size-3 rounded-full bg-danger" />} tone="navy" />
            <StatCard label="Needs review" value={count(["pending", "not_verified"])} icon={<span className="size-3 rounded-full bg-brand-blue" />} />
          </section>
          <Card>
            <CardHeader title={`${office.name} · ${date}`} icon={<ClipboardList className="size-4" />} />
            <CardBody className="pt-2">
              <ul className="divide-y divide-border">
                {rows.map((r) => {
                  const st = STATUS[r.status] ?? STATUS.absent;
                  return (
                    <li key={r.member} className={cn("flex flex-wrap items-center gap-3 border-l-4 py-3 pl-3",
                      r.status === "late" ? "border-l-[#f59e0b]" : r.status === "absent" ? "border-l-danger" : ["on_time", "present"].includes(r.status) ? "border-l-brand-green" : "border-l-transparent")}>
                      <Avatar name={r.full_name} src={r.avatar_url} size={36} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">{r.full_name}</span>
                        <span className="text-xs text-fg-subtle">{r.member_code}{r.check_in_at && ` · in ${formatTime(r.check_in_at)}`}{r.check_out_at && ` · out ${formatTime(r.check_out_at)}`}</span>
                      </span>
                      <Badge tone={st.tone}>{st.label}{r.status === "late" && r.minutes_late ? ` · ${r.minutes_late} min` : ""}</Badge>
                      {r.status === "absent" && r.member !== viewer.id && <MarkPresent userId={r.member} officeId={office.id} date={date} />}
                    </li>
                  );
                })}
                {rows.length === 0 && <li className="py-8 text-center text-sm text-fg-muted">No members in this office yet.</li>}
              </ul>
            </CardBody>
          </Card>
        </>
      )}
    </>
  );
}
