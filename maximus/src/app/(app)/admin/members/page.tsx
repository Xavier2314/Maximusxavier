import Link from "next/link";
import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/form";
import { Avatar, Badge, PageHeader } from "@/components/ui/misc";
import { PositionSwitcher } from "@/components/position-switcher";
import { ROLE_LABELS, requireViewer } from "@/lib/auth";
import { currentPosition } from "@/lib/positions";
import { createClient } from "@/lib/supabase/server";
import type { RoleKey } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { redirect } from "next/navigation";

export const metadata = { title: "Members & roles" };
const PAGE = 25;

type Row = { id: string; full_name: string; member_id: string; email: string; avatar_url: string | null; status: string; joined_at: string;
  offices: { name: string } | null; user_roles: { roles: { key: RoleKey } | null }[] };

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string; office?: string; role?: string; page?: string }> }) {
  const viewer = await requireViewer();
  if (!viewer.can("manage_roles") && !viewer.isAdmin) redirect("/forbidden");
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let q = supabase.from("profiles")
    .select(`id, full_name, member_id, email, avatar_url, status, joined_at, offices!profiles_office_id_fkey(name), user_roles${sp.role ? "!inner" : ""}(roles${sp.role ? "!inner" : ""}(key))`, { count: "exact" })
    .order("joined_at", { ascending: false }).range((page - 1) * PAGE, page * PAGE - 1);
  if (sp.q) {
    const term = sp.q.replace(/[%,()]/g, " ").trim();
    q = q.or(`full_name.ilike.%${term}%,member_id.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`);
  }
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.office) q = q.eq("office_id", sp.office);
  if (sp.role) q = q.eq("user_roles.roles.key", sp.role);

  const [{ data, count }, { data: offices }] = await Promise.all([
    q.returns<Row[]>(),
    supabase.from("offices").select("id, name").order("name"),
  ]);
  const canSwitch = viewer.can("manage_roles");
  const pages = Math.max(1, Math.ceil((count ?? 0) / PAGE));
  const qs = (p: Record<string, string | number>) => `/admin/members?${new URLSearchParams({ ...Object.fromEntries(Object.entries(sp).filter(([, v]) => v)), ...Object.fromEntries(Object.entries(p).map(([k, v]) => [k, String(v)])) } as Record<string, string>)}`;

  return (
    <>
      <PageHeader eyebrow="Administration" title="Members & roles" description={`${count ?? 0} members`}
        action={<LinkButton href="/api/export/members" variant="outline" size="sm" prefetch={false}><Download className="size-4" aria-hidden /> Export CSV</LinkButton>} />
      <Card>
        <form className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_auto_auto_auto_auto]" role="search">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden />
            <Input name="q" defaultValue={sp.q} placeholder="Name, Member ID, email or phone" className="pl-9" aria-label="Search members" />
          </div>
          <Select name="status" defaultValue={sp.status ?? ""} aria-label="Status"><option value="">Any status</option><option value="active">Active</option><option value="suspended">Suspended</option><option value="deactivated">Deactivated</option></Select>
          <Select name="role" defaultValue={sp.role ?? ""} aria-label="Role"><option value="">Any role</option>{Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
          <Select name="office" defaultValue={sp.office ?? ""} aria-label="Office"><option value="">Any office</option>{(offices ?? []).map((o) => <option key={o.id as string} value={o.id as string}>{o.name as string}</option>)}</Select>
          <button className="h-11 rounded-xl bg-primary px-4 text-sm font-medium text-primary-fg">Filter</button>
        </form>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-fg-subtle">
              <tr className="border-b border-border">
                <th scope="col" className="px-4 py-3 font-medium">Member</th><th scope="col" className="px-4 py-3 font-medium">Office</th>
                <th scope="col" className="px-4 py-3 font-medium">Role</th><th scope="col" className="px-4 py-3 font-medium">Joined</th><th scope="col" className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((m) => (
                <tr key={m.id} className="border-b border-border/60 last:border-0 hover:bg-surface-muted/60">
                  <td className="px-4 py-3">
                    <Link href={`/admin/members/${m.id}`} className="flex items-center gap-3">
                      <Avatar name={m.full_name} src={m.avatar_url} size={34} />
                      <span><span className="block font-medium hover:text-primary">{m.full_name}</span><span className="text-xs text-fg-subtle">{m.member_id} · {m.email}</span></span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{m.offices?.name ?? "—"}</td>
                  <td className="px-4 py-3">
                    {canSwitch ? (
                      <PositionSwitcher compact userId={m.id} name={m.full_name} disabled={m.id === viewer.id}
                        current={currentPosition(m.user_roles.map((r) => r.roles?.key ?? ""))}
                        earningsManager={m.user_roles.some((r) => r.roles?.key === "earnings_manager")} />
                    ) : (
                      <div className="flex flex-wrap gap-1">{m.user_roles.map((r) => r.roles?.key).filter((k): k is RoleKey => Boolean(k) && k !== "member" && k !== "downline").map((k) => <Badge key={k} tone={["super_admin", "executive_admin", "office_admin", "director", "team_leader", "earnings_manager"].includes(k) ? "blue" : "neutral"}>{ROLE_LABELS[k]}</Badge>)}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-fg-muted">{formatDate(m.joined_at)}</td>
                  <td className="px-4 py-3"><Badge tone={m.status === "active" ? "green" : "red"}>{m.status}</Badge></td>
                </tr>
              ))}
              {(data ?? []).length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-fg-muted">No members match.</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-border p-4 text-sm">
          <span className="text-fg-muted">Page {page} of {pages}</span>
          <div className="flex gap-2">
            {page > 1 && <Link href={qs({ page: page - 1 })} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-surface-muted"><ChevronLeft className="size-4" aria-hidden /> Previous</Link>}
            {page < pages && <Link href={qs({ page: page + 1 })} className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 hover:bg-surface-muted">Next <ChevronRight className="size-4" aria-hidden /></Link>}
          </div>
        </div>
      </Card>
    </>
  );
}
