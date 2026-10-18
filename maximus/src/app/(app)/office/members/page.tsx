import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircle, Search, Users } from "lucide-react";
import { GoalStatus } from "@/components/goal-status";
import { Card } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { GoalStatus as GoalStatusKey } from "@/lib/types";
import { cn, formatDate, formatRelative } from "@/lib/utils";
import { OfficePicker } from "../office-picker";

export const metadata = { title: "Office members" };

type Row = {
  member: string; full_name: string; member_code: string; avatar_url: string | null; phone: string | null; joined_at: string;
  is_manager: boolean; last_activity: string | null; days_present_30: number; goal_status: GoalStatusKey | null; evaluation_done: boolean;
};

const FILTERS = [
  { key: "all", label: "Everyone" },
  { key: "quiet", label: "Quiet 7+ days" },
  { key: "no_goals", label: "No goals" },
  { key: "no_eval", label: "No evaluation" },
] as const;
const WEEK = 7 * 864e5;

export default async function OfficeMembersPage({ searchParams }: { searchParams: Promise<{ office?: string; filter?: string; q?: string }> }) {
  const viewer = await requireViewer();
  if (viewer.offices.length === 0) redirect("/forbidden");
  const { office: wanted, filter = "all", q = "" } = await searchParams;
  const officeId = viewer.offices.find((o) => o.id === wanted)?.id
    ?? viewer.offices.find((o) => o.id === viewer.profile.office_id)?.id ?? viewer.offices[0].id;
  const officeName = viewer.offices.find((o) => o.id === officeId)?.name;

  const supabase = await createClient();
  const { data } = await supabase.rpc("office_members", { p_office: officeId });
  const all = (data as Row[] | null) ?? [];
  const now = Date.now();
  const quiet = (r: Row) => !r.last_activity || now - new Date(r.last_activity).getTime() > WEEK;
  const needle = q.trim().toLowerCase();
  const rows = all
    .filter((r) => filter !== "quiet" || quiet(r))
    .filter((r) => filter !== "no_goals" || !r.goal_status || r.goal_status === "draft")
    .filter((r) => filter !== "no_eval" || !r.evaluation_done)
    .filter((r) => !needle || r.full_name.toLowerCase().includes(needle) || r.member_code.toLowerCase().includes(needle));
  const href = (f: string) => `/office/members?office=${officeId}&filter=${f}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <>
      <PageHeader eyebrow="Office view" title="Office members" description={`${all.length} active members in ${officeName}`}
        action={<OfficePicker offices={viewer.offices} current={officeId} />} />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <nav aria-label="Filter members" className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          {FILTERS.map((f) => (
            <Link key={f.key} href={href(f.key)} aria-current={filter === f.key ? "page" : undefined}
              className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm",
                filter === f.key ? "border-primary bg-primary-soft font-medium text-primary" : "border-border text-fg-muted hover:text-fg")}>
              {f.label}
              {f.key === "quiet" && <span className="ml-1.5 tabular-nums">{all.filter(quiet).length}</span>}
            </Link>
          ))}
        </nav>
        <form className="relative sm:w-64" action="/office/members">
          <input type="hidden" name="office" value={officeId} />
          <input type="hidden" name="filter" value={filter} />
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
          <input name="q" defaultValue={q} placeholder="Search name or ID" aria-label="Search members"
            className="h-10 w-full rounded-xl border border-border bg-surface pl-9 pr-3 text-sm" />
        </form>
      </div>

      {rows.length === 0 ? (
        <Card><EmptyState icon={<Users className="size-6" />} title="No members match" description="Try another filter or search." /></Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="border-b border-border bg-surface-muted/50 text-left text-xs uppercase tracking-wide text-fg-subtle">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Member</th>
                  <th scope="col" className="px-4 py-3 font-medium">Last active</th>
                  <th scope="col" className="px-4 py-3 text-right font-medium">Days in office (30d)</th>
                  <th scope="col" className="px-4 py-3 font-medium">This month&apos;s goals</th>
                  <th scope="col" className="px-4 py-3 font-medium">Evaluation</th>
                  <th scope="col" className="px-4 py-3"><span className="sr-only">Contact</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.member} className="hover:bg-surface-muted/40">
                    <td className="px-4 py-3">
                      <Link href={`/team/${r.member}`} className="flex items-center gap-3">
                        <Avatar name={r.full_name} src={r.avatar_url} size={34} />
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5 font-medium hover:text-primary">{r.full_name}{r.is_manager && <Badge tone="blue">Manager</Badge>}</span>
                          <span className="text-xs text-fg-subtle">{r.member_code} · joined {formatDate(r.joined_at, { month: "short", year: "numeric" })}</span>
                        </span>
                      </Link>
                    </td>
                    <td className={cn("px-4 py-3", quiet(r) ? "text-warning" : "text-fg-muted")}>
                      {r.last_activity ? formatRelative(r.last_activity) : "No activity yet"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular-nums">{r.days_present_30}</td>
                    <td className="px-4 py-3">{r.goal_status ? <GoalStatus status={r.goal_status} /> : <Badge>Not set</Badge>}</td>
                    <td className="px-4 py-3">{r.evaluation_done ? <Badge tone="green">Done</Badge> : <Badge tone="amber">Due</Badge>}</td>
                    <td className="px-4 py-3 text-right">
                      {r.phone && (
                        <a href={`https://wa.me/${r.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer"
                          className="inline-grid size-9 place-items-center rounded-xl text-success hover:bg-success-soft" aria-label={`WhatsApp ${r.full_name}`}>
                          <MessageCircle className="size-4" aria-hidden />
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      <p className="mt-4 text-xs text-fg-subtle">Last active = latest check-in, evaluation, order or prospect update.</p>
    </>
  );
}
