"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";
import { parseVideoLink } from "@/lib/featured";

type State = { ok: boolean; message: string } | null;

export async function saveFeaturedVideoAction(_: State, form: FormData): Promise<State> {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("super_admin")) return { ok: false, message: "Only a Super Admin can feature a video." };
  const supabase = await createClient();
  if (form.get("intent") === "remove") {
    const { error } = await supabase.from("app_settings").upsert({ key: "featured_video", value: { active: false }, updated_by: viewer.id, updated_at: new Date().toISOString() });
    if (error) return { ok: false, message: friendlyError(error) };
    revalidatePath("/", "layout");
    return { ok: true, message: "The featured video is now hidden for everyone." };
  }
  const parsed = z.object({
    url: z.string().trim().min(5, "Paste a YouTube or Loom link"),
    title: z.string().trim().min(2, "Give it a title").max(120),
    message: z.string().trim().max(300).optional(),
  }).safeParse({ url: form.get("url"), title: form.get("title"), message: form.get("message") || undefined });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const video = parseVideoLink(parsed.data.url);
  if (!video) return { ok: false, message: "That doesn't look like a YouTube or Loom link. Copy it from the Share button." };
  const now = new Date().toISOString();
  const { error } = await supabase.from("app_settings").upsert({
    key: "featured_video",
    value: { provider: video.provider, video_id: video.video_id, title: parsed.data.title, message: parsed.data.message ?? null, popup: form.get("popup") === "on", active: true, updated_at: now },
    updated_by: viewer.id, updated_at: now,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/", "layout");
  return { ok: true, message: "Saved. Everyone will see this video on Home and in the side menu." };
}
