"use server";

import { z } from "zod";
import { getViewer } from "@/lib/auth";
import { cleanBlock, type FunnelBlock } from "@/lib/funnels";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type SavedSection = { id: string; name: string; content: FunnelBlock };
export type MediaItem = { name: string; url: string; created_at: string | null };

const id = z.string().uuid();

export async function listSavedSectionsAction(): Promise<SavedSection[]> {
  if (!(await getViewer())) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("funnel_saved_sections").select("id, name, content").order("created_at", { ascending: false }).limit(60);
  return (data ?? []).flatMap((r) => {
    const content = cleanBlock(r.content);
    return content ? [{ id: r.id as string, name: r.name as string, content }] : [];
  });
}

/** Keeps a copy of a section the member designed, so it can be dropped into any of their funnels. */
export async function saveSectionAction(name: string, block: string): Promise<{ ok: boolean; message: string; saved?: SavedSection }> {
  if (!(await getViewer())) return { ok: false, message: "Your session expired. Sign in again in another tab." };
  const n = z.string().trim().min(1, "Give the section a name.").max(80).safeParse(name);
  if (!n.success) return { ok: false, message: n.error.issues[0]?.message ?? "Give the section a name." };
  let raw: unknown;
  try { raw = block.length < 100_000 ? JSON.parse(block) : null; } catch { raw = null; }
  const content = cleanBlock(raw);
  if (!content) return { ok: false, message: "That section could not be saved." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("funnel_saved_sections").insert({ name: n.data, content }).select("id").single();
  if (error || !data) return { ok: false, message: friendlyError(error, "Could not save the section.") };
  return { ok: true, message: "Saved to your library.", saved: { id: data.id as string, name: n.data, content } };
}

export async function deleteSavedSectionAction(sectionId: string): Promise<boolean> {
  if (!id.safeParse(sectionId).success || !(await getViewer())) return false;
  const supabase = await createClient();
  const { error } = await supabase.from("funnel_saved_sections").delete().eq("id", sectionId);
  return !error;
}

/** The member's own uploaded pictures (newest first), for the media picker. */
export async function listMediaAction(): Promise<MediaItem[]> {
  const viewer = await getViewer();
  if (!viewer) return [];
  const supabase = await createClient();
  const dir = `${viewer.id}/funnels`;
  const { data } = await supabase.storage.from("portfolio").list(dir, { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  return (data ?? [])
    .filter((f) => f.name && /\.(jpe?g|png|webp|gif|avif)$/i.test(f.name))
    .map((f) => ({ name: f.name, url: supabase.storage.from("portfolio").getPublicUrl(`${dir}/${f.name}`).data.publicUrl, created_at: f.created_at ?? null }));
}
