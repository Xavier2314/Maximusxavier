import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { DeletePost } from "./delete-post";

export const metadata = { title: "Announcement" };

export default async function AnnouncementPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: p } = await supabase.from("announcements")
    .select("id, kind, title, body, published_at, author_id, profiles!announcements_author_id_fkey(full_name, avatar_url)")
    .eq("id", id).maybeSingle();
  if (!p) notFound();
  const author = p.profiles as unknown as { full_name: string; avatar_url: string | null } | null;
  const back = p.kind === "recognition" ? "/recognition" : "/announcements";
  return (
    <div className="mx-auto max-w-2xl">
      <Link href={back} className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Back</Link>
      <Card>
        <CardBody className="sm:p-8">
          <div className="flex items-center gap-3">
            <Avatar name={author?.full_name ?? "Maximus"} src={author?.avatar_url} size={44} />
            <div>
              <p className="font-semibold">{author?.full_name ?? "Maximus"}</p>
              <p className="text-xs text-fg-subtle">{formatDate(p.published_at as string, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-bold tracking-tight">{p.title as string}</h1>
          <p className="mt-3 whitespace-pre-line leading-relaxed text-fg-muted">{p.body as string}</p>
          {(p.author_id === viewer.id || viewer.isAdmin) && <div className="mt-8 border-t border-border pt-4"><DeletePost id={id} back={back} /></div>}
        </CardBody>
      </Card>
    </div>
  );
}
