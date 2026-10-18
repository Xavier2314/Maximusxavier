import Link from "next/link";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { GAMES } from "@/lib/games";
import { createClient } from "@/lib/supabase/server";
import { BackToTools } from "../timer-page";

export const metadata = { title: "Brain gym" };

export default async function BrainGymPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("game_scores").select("game, score").eq("user_id", viewer.id).limit(5000);
  const best = new Map<string, number>();
  const plays = new Map<string, number>();
  for (const r of data ?? []) {
    const g = GAMES.find((x) => x.slug === r.game);
    const cur = best.get(r.game);
    if (cur === undefined || (g?.higherIsBetter === false ? r.score < cur : r.score > cur)) best.set(r.game, r.score);
    plays.set(r.game, (plays.get(r.game) ?? 0) + 1);
  }
  return (
    <>
      <PageHeader eyebrow="Brain gym" title="Brain gym" description="Quick games for focus, memory and problem-solving. For fun and brain training, not a medical or IQ test."
        action={<BackToTools />} />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {GAMES.map((g) => (
          <Link key={g.slug} href={`/tools/brain/${g.slug}`} className="card p-4 transition-shadow hover:shadow-md">
            <span className="text-3xl" aria-hidden>{g.emoji}</span>
            <p className="mt-2 font-semibold">{g.name}</p>
            <p className="text-xs text-fg-muted">{g.skill}</p>
            <p className="mt-2 text-xs text-fg-subtle">{best.has(g.slug) ? `Best: ${best.get(g.slug)} ${g.unit} · ${plays.get(g.slug)} played` : "Not played yet"}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
