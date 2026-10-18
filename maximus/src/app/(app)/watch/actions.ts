"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";
import { youtubeId } from "@/lib/youtube";

export type WatchState = { ok: boolean; message: string; slug?: string } | null;

export async function createWatchRoomAction(_: WatchState, form: FormData): Promise<WatchState> {
  const parsed = z.object({
    url: z.string().trim().min(5, "Paste a YouTube link"),
    title: z.string().trim().min(2, "Give it a title").max(120),
    description: z.string().trim().max(1000).optional(),
    live_sync: z.enum(["on"]).optional(),
  }).safeParse({
    url: form.get("url"), title: form.get("title"), description: form.get("description") || undefined, live_sync: form.get("live_sync") ?? undefined,
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const id = youtubeId(parsed.data.url);
  if (!id) return { ok: false, message: "That doesn't look like a YouTube link. Copy it from the Share button on YouTube." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("watch_rooms")
    .insert({ title: parsed.data.title, description: parsed.data.description ?? null, youtube_id: id, live_sync: Boolean(parsed.data.live_sync) })
    .select("slug").single();
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/watch");
  return { ok: true, message: "Your watch link is ready. Share it below.", slug: data.slug as string };
}

export async function deleteWatchRoomAction(id: string) {
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("watch_rooms").delete().eq("id", id);
  revalidatePath("/watch");
}
