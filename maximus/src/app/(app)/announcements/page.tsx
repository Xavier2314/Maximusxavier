import Link from "next/link";
import { GraduationCap, Megaphone, Pin, Plus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import { PostForm } from "./post-form";

export const metadata = { title: "Announcements" };

type Post = { id: string; kind: string; audience: string; title: string; body: string; pinned: boolean; published_at: string;
  profiles: { full_name: string; avatar_url: string | null } | null };

export default async function AnnouncementsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const canOrgPublish = viewer.can("publish_announcements");
  const [{ data: posts }, { data: allOffices }, { data: postableOffices }] = await Promise.all([
    supabase.from("announcements").select("id, kind, audience, title, body, pinned, published_at, profiles!announcements_author_id_fkey(full_name, avatar_url)")
      .in("kind", ["announcement", "training"]).order("pinned", { ascending: false }).order("published_at", { ascending: false }).limit(50).returns<Post[]>(),
    // Org-wide publishers can address any office; everyone else (e.g. a Team Leader) only the
    // office(s) they're assigned to and can already see the roster of.
    canOrgPublish ? supabase.from("offices").select("id, name").eq("is_active", true) : Promise.resolve({ data: [] }),
    canOrgPublish ? Promise.resolve({ data: [] }) : supabase.rpc("my_postable_offices"),
  ]);
  const offices = ((canOrgPublish ? allOffices : postableOffices) as { id: string; name: string }[] | null) ?? [];
  const canPublish = canOrgPublish || offices.length > 0;

  return (
    <>
      <PageHeader eyebrow="Community" title="Announcements" description="News, trainings and updates from Maximus leadership." />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {(posts ?? []).length === 0 && <Card><EmptyState icon={<Megaphone className="size-6" />} title="No announcements yet" /></Card>}
          {(posts ?? []).map((p) => (
            <Card key={p.id} id={`a-${p.id}`} className="animate-rise scroll-mt-32">
              <CardBody>
                <div className="flex items-center gap-3">
                  <Avatar name={p.profiles?.full_name ?? "Maximus"} src={p.profiles?.avatar_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">{p.profiles?.full_name ?? "Maximus"}</p>
                    <p className="text-xs text-fg-subtle">{formatRelative(p.published_at)} · {p.audience === "all" ? "Everyone" : p.audience === "office" ? "Office" : "Team"}</p>
                  </div>
                  {p.pinned && <Badge tone="lime"><Pin className="size-3" aria-hidden /> Pinned</Badge>}
                  {p.kind === "training" && <Badge tone="blue"><GraduationCap className="size-3" aria-hidden /> Training</Badge>}
                </div>
                <Link href={`/announcements/${p.id}`} className="mt-4 block">
                  <h2 className="text-lg font-semibold tracking-tight hover:text-primary">{p.title}</h2>
                  <p className="mt-1 line-clamp-4 whitespace-pre-line text-fg-muted">{p.body}</p>
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
        {canPublish && (
          <Card className="h-fit lg:sticky lg:top-24">
            <CardHeader title="New announcement" icon={<Plus className="size-4" />} />
            <CardBody>
              <PostForm mode="announcement" offices={offices.map((o) => ({ id: o.id, name: o.name }))}
                members={[]} canOrgWide={viewer.isAdmin} canTeam={canOrgPublish} />
            </CardBody>
          </Card>
        )}
      </div>
    </>
  );
}
