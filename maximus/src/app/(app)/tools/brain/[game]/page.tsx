import { notFound } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { gameBySlug } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import { GameHost } from "../game-host";

export async function generateMetadata({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  return { title: gameBySlug(game)?.name ?? "Brain gym" };
}

export default async function GamePage({ params }: { params: Promise<{ game: string }> }) {
  const { game } = await params;
  const info = gameBySlug(game);
  if (!info) notFound();
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("game_scores").select("score, created_at").eq("user_id", viewer.id).eq("game", info.slug)
    .order("score", { ascending: !info.higherIsBetter }).limit(1).maybeSingle();
  return (
    <>
      <PageHeader eyebrow={`Brain gym · ${info.skill}`} title={`${info.emoji} ${info.name}`} description={info.desc}
        action={<LinkButton href="/tools/brain" variant="ghost" size="sm">All games</LinkButton>} />
      <GameHost slug={info.slug} best={(data?.score as number | undefined) ?? null} unit={info.unit} higherIsBetter={info.higherIsBetter} />
    </>
  );
}
