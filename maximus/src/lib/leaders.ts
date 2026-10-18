import "server-only";
import type { Leader } from "@/components/send-to-leaders";
import type { createClient } from "@/lib/supabase/server";

/** The signed-in member's sponsor and team leader. */
export async function getMyLeaders(supabase: Awaited<ReturnType<typeof createClient>>): Promise<Leader[]> {
  const { data } = await supabase.rpc("my_leaders");
  return ((data ?? []) as Leader[]).filter((l, i, all) => all.findIndex((x) => x.relation === l.relation) === i);
}
