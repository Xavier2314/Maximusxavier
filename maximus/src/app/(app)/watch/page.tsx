import { PlayCircle, Users } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import { youtubeThumb } from "@/lib/youtube";
import { RoomActions, WatchRoomForm } from "./watch-ui";

export const metadata = { title: "Watch party" };

type Room = { id: string; slug: string; title: string; youtube_id: string; live_sync: boolean; views: number; created_at: string };

export default async function WatchPage() {
  await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("watch_rooms").select("id, slug, title, youtube_id, live_sync, views, created_at")
    .order("created_at", { ascending: false }).returns<Room[]>();
  const rooms = data ?? [];
  return (
    <>
      <PageHeader eyebrow="Share" title="Watch party"
        description="Turn any YouTube video into a link you can share. Anyone can open it, no account needed, and watch together with you live." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title="New watch link" icon={<PlayCircle className="size-4" />} />
          <CardBody><WatchRoomForm /></CardBody>
        </Card>
        <div className="min-w-0 space-y-3 lg:col-span-2">
          {rooms.length === 0 && <Card><EmptyState icon={<PlayCircle className="size-6" />} title="No watch links yet" description="Paste a YouTube link to make your first one." /></Card>}
          {rooms.map((r) => (
            <Card key={r.id} className="overflow-hidden">
              <div className="flex flex-col sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={youtubeThumb(r.youtube_id)} alt="" className="aspect-video w-full object-cover sm:w-56" />
                <CardBody className="min-w-0 flex-1 space-y-2">
                  <p className="truncate font-semibold">{r.title}</p>
                  <p className="flex items-center gap-1.5 text-xs text-fg-subtle">
                    <Users className="size-3.5" aria-hidden />{r.views} view{r.views === 1 ? "" : "s"} · {formatRelative(r.created_at)}{r.live_sync ? " · Watch together" : ""}
                  </p>
                  <RoomActions id={r.id} slug={r.slug} title={r.title} />
                </CardBody>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}
