import Link from "next/link";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { TeamMemberStat } from "@/lib/types";
import { formatRelative } from "@/lib/utils";
import { PlaceRow } from "./place-row";

export const metadata = { title: "Place in an office" };

type Person = { id: string; full_name: string; avatar_url: string | null; member_id: string; joined_at: string; office_id: string | null };

export default async function PlaceInOfficePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const viewer = await requireViewer();
  const superAdmin = viewer.roles.includes("super_admin");
  if (!superAdmin && !viewer.roles.includes("team_leader")) redirect("/forbidden");
  const { q = "" } = await searchParams;
  const supabase = await createClient();

  // Super Admins see everyone; Team Leaders only their own team.
  const [{ data: offices }, teamRes] = await Promise.all([
    supabase.rpc("list_public_offices"),
    superAdmin ? Promise.resolve({ data: null }) : supabase.rpc("team_member_stats", { p_root: viewer.id, p_max_depth: null }),
  ]);
  const teamIds = superAdmin ? null : new Set(((teamRes.data as TeamMemberStat[] | null) ?? []).filter((m) => m.depth >= 1).map((m) => m.member));
  const needle = q.trim();
  let query = supabase.from("profiles").select("id, full_name, avatar_url, member_id, joined_at, office_id")
    .eq("status", "active").neq("id", viewer.id).order("joined_at", { ascending: false }).limit(100);
  query = needle ? query.or(`full_name.ilike.%${needle.replace(/[%,()]/g, "")}%,member_id.ilike.%${needle.replace(/[%,()]/g, "")}%`) : query.is("office_id", null);
  const { data } = await query;
  const people = ((data ?? []) as Person[]).filter((p) => !teamIds || teamIds.has(p.id));
  const officeList = (offices as { id: string; name: string }[] | null) ?? [];

  return (
    <>
      <PageHeader eyebrow="Office view" title="Place in an office"
        description={superAdmin ? "Members without an office are listed first. Search to move anyone to the right office."
          : "People in your team without an office. Search your team to move someone to the right office."} />
      <form className="mb-4 max-w-sm" action="/office/place">
        <input name="q" defaultValue={q} placeholder="Search by name or member ID" aria-label="Search members"
          className="h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm" />
      </form>
      {people.length === 0 ? (
        <Card><EmptyState icon={<Building2 className="size-6" />} title={needle ? "No one found" : "Everyone has an office"}
          description={needle ? "Try another name or member ID." : "New members who skip choosing an office will appear here."} /></Card>
      ) : (
        <Card className="divide-y divide-border">
          {people.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <Link href={`/team/${p.id}?view=team`} className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar name={p.full_name} src={p.avatar_url} size={38} />
                <span className="min-w-0">
                  <span className="block truncate font-medium hover:text-primary">{p.full_name}</span>
                  <span className="text-xs text-fg-subtle">{p.member_id} · joined {formatRelative(p.joined_at)}
                    {p.office_id ? ` · ${officeList.find((o) => o.id === p.office_id)?.name ?? "office"}` : " · no office"}</span>
                </span>
              </Link>
              <PlaceRow memberId={p.id} current={p.office_id} offices={officeList} />
            </div>
          ))}
        </Card>
      )}
    </>
  );
}
