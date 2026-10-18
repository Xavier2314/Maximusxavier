import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Network, ShieldCheck, UserCog } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge } from "@/components/ui/misc";
import { ROLE_LABELS, requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Profile, RoleKey } from "@/lib/types";
import { PositionSwitcher } from "@/components/position-switcher";
import { currentPosition } from "@/lib/positions";
import { formatDate, formatRelative } from "@/lib/utils";
import { MemberControls } from "./member-controls";

export const metadata = { title: "Manage member" };

export default async function ManageMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  if (!viewer.can("manage_roles") && !viewer.isAdmin) redirect("/forbidden");
  const supabase = await createClient();
  const { data: m } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>();
  if (!m) notFound();
  const [{ data: roleRows }, { data: allRoles }, { data: sponsor }, { data: audits }, { data: offices }, { data: memberships }] = await Promise.all([
    supabase.from("user_roles").select("granted_at, roles(key)").eq("user_id", id),
    supabase.from("roles").select("key, name, rank").order("rank"),
    m.sponsor_id ? supabase.from("profiles").select("full_name, member_id").eq("id", m.sponsor_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("audit_logs").select("id, action, data, created_at").eq("entity_id", id).order("created_at", { ascending: false }).limit(15),
    supabase.from("offices").select("id, name").order("name"),
    supabase.from("office_memberships").select("office_id").eq("user_id", id),
  ]);
  const held = new Set(((roleRows ?? []) as unknown as { roles: { key: RoleKey } | null }[]).map((r) => r.roles?.key).filter(Boolean) as RoleKey[]);

  return (
    <>
      <Link href="/admin/members" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Members</Link>
      <div className="mb-6 flex items-center gap-4">
        <Avatar name={m.full_name} src={m.avatar_url} size={64} />
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{m.full_name}</h1>
          <p className="text-fg-muted">{m.member_id} · {m.email} · {m.phone ?? "no phone"}</p>
          <div className="mt-1 flex gap-2"><Badge tone={m.status === "active" ? "green" : "red"}>{m.status}</Badge><Badge>Joined {formatDate(m.joined_at)}</Badge></div>
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Roles & access" icon={<ShieldCheck className="size-4" />} description="Sponsor, Upline and Downline are assigned automatically from the team tree." />
          <CardBody>
            {viewer.can("manage_roles") && (
              <div className="mb-8 rounded-2xl border border-primary/30 bg-primary-soft/40 p-4">
                <p className="mb-3 text-sm font-semibold">Position</p>
                <PositionSwitcher userId={id} name={m.full_name} disabled={id === viewer.id}
                  current={currentPosition([...held])} earningsManager={held.has("earnings_manager")} />
              </div>
            )}
            <MemberControls userId={id} isSelf={id === viewer.id} status={m.status} sponsorLabel={sponsor ? `${sponsor.full_name} (${sponsor.member_id})` : "None"}
              roles={((allRoles ?? []) as { key: RoleKey; name: string; rank: number }[]).map((r) => ({ ...r, held: held.has(r.key) }))}
              offices={((offices ?? []) as { id: string; name: string }[])} memberOffices={((memberships ?? []) as { office_id: string }[]).map((x) => x.office_id)} />
          </CardBody>
        </Card>
        <div className="space-y-6">
          <Card>
            <CardHeader title="Quick links" icon={<UserCog className="size-4" />} />
            <CardBody className="space-y-2 text-sm">
              <Link href={`/team/${id}`} className="flex items-center gap-2 text-primary hover:underline"><Network className="size-4" aria-hidden /> Activity profile</Link>
              <Link href={`/finance?member=${id}`} className="flex items-center gap-2 text-primary hover:underline">Financial records</Link>
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Recent audit history" />
            <CardBody className="pt-2">
              {(audits ?? []).length ? (
                <ul className="space-y-2 text-sm">
                  {(audits ?? []).map((a) => (
                    <li key={a.id as number}><span className="font-medium">{String(a.action).replace(/_/g, " ")}</span> {a.data && (a.data as { role?: string }).role ? `· ${ROLE_LABELS[(a.data as { role: RoleKey }).role] ?? ""}` : ""}<span className="block text-xs text-fg-subtle">{formatRelative(a.created_at as string)}</span></li>
                  ))}
                </ul>
              ) : <p className="text-sm text-fg-muted">No changes recorded.</p>}
            </CardBody>
          </Card>
        </div>
      </div>
    </>
  );
}
