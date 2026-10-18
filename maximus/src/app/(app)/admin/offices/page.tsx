import { Building2, MapPin, Plus, ShieldCheck } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requirePermission } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Office } from "@/lib/types";
import { AssignForm, RemoveMember } from "./assign-form";
import { OfficeForm } from "./office-form";

export const metadata = { title: "Offices" };

type Membership = { office_id: string; user_id: string; is_manager: boolean; profiles: { full_name: string; avatar_url: string | null; member_id: string } | null };

export default async function OfficesPage() {
  const viewer = await requirePermission("manage_office");
  const supabase = await createClient();
  const [{ data: offices }, { data: memberships }] = await Promise.all([
    supabase.from("offices").select("id, name, address, latitude, longitude, radius_m, timezone, schedule, manager_id, is_active, late_grace_minutes").order("name").returns<Office[]>(),
    supabase.from("office_memberships").select("office_id, user_id, is_manager, profiles!office_memberships_user_id_fkey(full_name, avatar_url, member_id)").returns<Membership[]>(),
  ]);
  const canCreate = viewer.isAdmin;

  return (
    <>
      <PageHeader eyebrow="Administration" title="Offices" description="Locations, check-in radius, working days and assigned members." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {(offices ?? []).length === 0 && (
            <Card><EmptyState icon={<Building2 className="size-6" />} title="No offices yet" description="Create your first office so members can register and check in." /></Card>
          )}
          {(offices ?? []).map((o) => {
            const members = (memberships ?? []).filter((m) => m.office_id === o.id);
            return (
              <Card key={o.id}>
                <CardHeader title={o.name} icon={<Building2 className="size-4" />}
                  description={<span className="inline-flex items-center gap-1"><MapPin className="size-3.5" aria-hidden />{o.address ?? "No address"} · {o.radius_m} m radius</span>}
                  action={o.is_active ? <Badge tone="green">Active</Badge> : <Badge>Inactive</Badge>} />
                <CardBody className="space-y-6">
                  <details className="group rounded-2xl border border-border p-4">
                    <summary className="cursor-pointer text-sm font-medium text-primary">Edit office details</summary>
                    <div className="mt-4"><OfficeForm office={o} /></div>
                  </details>
                  <div>
                    <h3 className="mb-3 text-sm font-semibold">Members ({members.length})</h3>
                    {members.length > 0 ? (
                      <ul className="mb-4 flex flex-wrap gap-2">
                        {members.map((m) => (
                          <li key={m.user_id} className="flex items-center gap-2 rounded-full border border-border py-1 pl-1 pr-1.5 text-sm">
                            <Avatar name={m.profiles?.full_name ?? "?"} src={m.profiles?.avatar_url} size={26} />
                            {m.profiles?.full_name ?? m.user_id.slice(0, 6)}
                            {m.is_manager && <ShieldCheck className="size-4 text-primary" aria-label="Office manager" />}
                            <RemoveMember officeId={o.id} userId={m.user_id} name={m.profiles?.full_name ?? "member"} />
                          </li>
                        ))}
                      </ul>
                    ) : <p className="mb-4 text-sm text-fg-muted">No members assigned yet.</p>}
                    <AssignForm officeId={o.id} />
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
        {canCreate && (
          <Card className="h-fit xl:sticky xl:top-24">
            <CardHeader title="New office" icon={<Plus className="size-4" />} />
            <CardBody><OfficeForm /></CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
