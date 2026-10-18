import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/misc";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { youtubeThumb } from "@/lib/youtube";
import { WatchPlayer } from "./watch-player";

type Room = { id: string; slug: string; title: string; description: string | null; youtube_id: string; live_sync: boolean; created_by: string;
  profiles: { full_name: string; avatar_url: string | null; referral_code: string } | null };

const SLUG = /^[a-z0-9]{6,20}$/;

async function getRoom(slug: string) {
  if (!SLUG.test(slug)) return null;
  const admin = createAdminClient();
  const { data } = await admin.from("watch_rooms")
    .select("id, slug, title, description, youtube_id, live_sync, created_by, profiles!watch_rooms_created_by_fkey(full_name, avatar_url, referral_code)")
    .eq("slug", slug).maybeSingle<Room>();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const room = await getRoom((await params).slug);
  if (!room) return { title: "Video not found" };
  const by = room.profiles?.full_name ? `Shared by ${room.profiles.full_name}` : "Watch together";
  return {
    title: room.title,
    description: room.description ?? by,
    openGraph: { title: room.title, description: room.description ?? by, images: [youtubeThumb(room.youtube_id)] },
  };
}

/** Public watch page: anyone with the link can watch, with or without an account. */
export default async function WatchRoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const room = await getRoom(slug);
  if (!room) notFound();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const isHost = user?.id === room.created_by;
  if (!isHost) await createAdminClient().rpc("watch_room_viewed", { p_slug: room.slug });
  const host = room.profiles;

  return (
    <div className="min-h-dvh bg-brand-navy text-white">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))]">
        <Link href={user ? "/dashboard" : "/"} aria-label="Maximus"><Logo className="h-7 w-auto text-white" /></Link>
        {user ? (
          <Link href="/watch" className="text-sm font-medium text-white/75 hover:text-white">My watch links</Link>
        ) : host?.referral_code ? (
          <Link href={`/register?ref=${encodeURIComponent(host.referral_code)}`} className="rounded-xl bg-brand-lime px-4 py-2 text-sm font-semibold text-brand-navy">Join Maximus</Link>
        ) : null}
      </header>
      <main className="mx-auto max-w-5xl px-4 pb-12">
        <WatchPlayer slug={room.slug} videoId={room.youtube_id} sync={room.live_sync} isHost={isHost} />
        <div className="mt-5 flex items-start gap-3">
          {host && <Avatar name={host.full_name} src={host.avatar_url} size={44} className="ring-2 ring-white/15" />}
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-snug sm:text-2xl">{room.title}</h1>
            {host && <p className="text-sm text-white/65">Shared by {host.full_name}</p>}
            {room.description && <p className="mt-3 whitespace-pre-line text-white/85">{room.description}</p>}
          </div>
        </div>
        {!user && host?.referral_code && (
          <div className="mt-8 rounded-2xl bg-white/10 p-5 ring-1 ring-white/15">
            <p className="text-lg font-bold">Like what you saw?</p>
            <p className="mt-1 text-white/75">Join {host.full_name.split(" ")[0]} on Maximus and start building your future.</p>
            <Link href={`/register?ref=${encodeURIComponent(host.referral_code)}`}
              className="mt-4 inline-flex h-11 items-center rounded-xl bg-brand-lime px-5 font-semibold text-brand-navy">Create my free account</Link>
          </div>
        )}
      </main>
    </div>
  );
}
