"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer, requireViewer } from "@/lib/auth";
import { designFunnel, reviseFunnel } from "@/lib/funnel-ai";
import { STYLES } from "@/lib/funnel-styles";
import { starterPages } from "@/lib/funnel-templates";
import { cleanPages, cleanProduct, cleanTheme, FUNNEL_TYPES, STYLE_KEYS, type FunnelPage, type FunnelProduct, type FunnelTheme, type StyleKey } from "@/lib/funnels";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type State = { ok: boolean; message: string } | null;
export type AiResult = { ok: boolean; message: string; pages?: FunnelPage[]; theme?: FunnelTheme };

const slugRule = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, "Use 3–40 letters, numbers or dashes for the link.");
const id = z.string().uuid();

export async function createFunnelAction(_: State, form: FormData): Promise<State> {
  const viewer = await requireViewer();
  const funnelType = z.enum(FUNNEL_TYPES.map((t) => t.key) as [string, ...string[]]).catch("sales").parse(form.get("funnelType"));
  const product = cleanProduct({
    name: form.get("name"), price: form.get("price"), description: form.get("description"), benefits: form.get("benefits"),
    audience: form.get("audience"), offer: form.get("offer"), imageUrl: form.get("imageUrl"), whatsapp: form.get("whatsapp") === "on", funnelType,
    images: (() => { try { const v = JSON.parse(String(form.get("images") ?? "[]")); return Array.isArray(v) ? v : []; } catch { return []; } })(),
  });
  if (!product.name) return { ok: false, message: "Enter the product name." };
  const picked = z.enum(["auto", ...STYLE_KEYS] as [string, ...string[]]).catch("auto").parse(form.get("style")) as StyleKey | "auto";
  const mode = form.get("mode") === "template" ? "template" : "ai";
  const tone = z.string().trim().max(60).catch("").parse(form.get("tone") ?? "");

  const styleKey: StyleKey = picked === "auto" ? "clean" : picked;
  let theme: FunnelTheme = { style: styleKey, accent: STYLES[styleKey].accent, mode: STYLES[styleKey].mode };
  let pages: FunnelPage[] = starterPages(product.funnelType, product);
  let title = product.name;

  if (mode === "ai") {
    if (product.description.length < 10 && product.benefits.length < 10) return { ok: false, message: "Tell the AI a little about the product: what it is and its benefits." };
    const draft = await designFunnel({ product, tone, style: picked, ownerName: viewer.profile.full_name });
    if ("error" in draft) return { ok: false, message: draft.error };
    pages = draft.pages;
    title = draft.title || product.name;
    // A style the seller picked is kept exactly; with "let AI choose" the AI's style and colours are used.
    theme = picked === "auto" ? draft.theme : { style: picked, accent: draft.theme.accent, mode: STYLES[picked].mode };
  }

  const supabase = await createClient();
  const { data: slug } = await supabase.rpc("suggest_funnel_slug", { p_hint: product.name });
  const { data, error } = await supabase.from("funnels").insert({ title: title.slice(0, 80), slug: slug as string, product, theme, pages, published: false }).select("id").single();
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  revalidatePath("/marketing/funnels");
  redirect(`/builder/${data.id}?new=1`);
}

export type SaveResult = { ok: boolean; message: string; version?: string; conflict?: boolean };
export type VersionRow = { id: string; kind: "auto" | "manual" | "publish" | "restore"; label: string | null; created_at: string };
export type Snapshot = { title: string; theme: FunnelTheme; product: FunnelProduct; pages: FunnelPage[] };

const AUTO_EVERY_MS = 10 * 60_000;

const snapshotOf = (raw: unknown): Snapshot | null => {
  const o = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const pages = cleanPages(o.pages);
  if (!pages.length) return null;
  return { title: String(o.title ?? "").slice(0, 80), theme: cleanTheme(o.theme), product: cleanProduct(o.product), pages };
};

/** Autosave. Uses the version the editor loaded (`baseVersion`) so a second tab cannot silently overwrite newer work. */
export async function saveFunnelAction(funnelId: string, payload: string, baseVersion?: string | null): Promise<SaveResult> {
  if (!id.safeParse(funnelId).success) return { ok: false, message: "Unknown funnel." };
  // Never redirect from an autosave: if the session expired, keep the member's edits on screen and say so.
  if (!(await getViewer())) return { ok: false, message: "Your session expired, so changes are not being saved. Sign in again in another tab, then keep editing here." };
  let raw: Record<string, unknown>;
  try { raw = payload.length < 600_000 ? JSON.parse(payload) : {}; } catch { return { ok: false, message: "Could not read your changes." }; }
  const head = z.object({ title: z.string().trim().min(1, "Give the funnel a name.").max(80), slug: slugRule }).safeParse(raw);
  if (!head.success) return { ok: false, message: head.error.issues[0]?.message ?? "Check the funnel settings." };
  const pages = cleanPages(raw.pages);
  if (!pages.length) return { ok: false, message: "A funnel needs at least one page." };
  const supabase = await createClient();
  const product = cleanProduct(raw.product);
  const theme = cleanTheme(raw.theme);
  let q = supabase.from("funnels").update({ ...head.data, product, theme, pages }).eq("id", funnelId);
  if (baseVersion) q = q.eq("updated_at", baseVersion);
  const { data, error } = await q.select("updated_at");
  if (error) return { ok: false, message: error.code === "23505" ? "That link name is taken. Try another." : friendlyError(error) };
  if (!data?.length) {
    const { data: exists } = await supabase.from("funnels").select("id").eq("id", funnelId).maybeSingle();
    return exists
      ? { ok: false, conflict: true, message: "This funnel was changed somewhere else (another tab or device) after you opened it." }
      : { ok: false, message: "Unknown funnel." };
  }
  // A safety copy at most every 10 minutes, so there is always something recent to go back to.
  const { data: last } = await supabase.from("funnel_versions").select("created_at").eq("funnel_id", funnelId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!last || Date.now() - Date.parse(last.created_at) > AUTO_EVERY_MS) {
    await supabase.from("funnel_versions").insert({ funnel_id: funnelId, kind: "auto", snapshot: { title: head.data.title, theme, product, pages } });
  }
  return { ok: true, message: "Saved", version: data[0].updated_at };
}

/** Copies the current draft to the public (live) version and snapshots it in the history. */
export async function publishFunnelAction(funnelId: string): Promise<{ ok: boolean; message: string; liveAt?: string; version?: string }> {
  if (!id.safeParse(funnelId).success) return { ok: false, message: "Unknown funnel." };
  if (!(await getViewer())) return { ok: false, message: "Your session expired. Sign in again in another tab, then publish." };
  const supabase = await createClient();
  const { data: f } = await supabase.from("funnels").select("title, theme, product, pages").eq("id", funnelId).maybeSingle();
  const snap = f && snapshotOf(f);
  if (!f || !snap) return { ok: false, message: "Unknown funnel." };
  const snapshot = { ...snap, title: f.title as string };
  const liveAt = new Date().toISOString();
  const { data, error } = await supabase.from("funnels").update({ live: snapshot, live_at: liveAt, published: true }).eq("id", funnelId).select("updated_at");
  if (error) return { ok: false, message: friendlyError(error) };
  await supabase.from("funnel_versions").insert({ funnel_id: funnelId, kind: "publish", label: "Published", snapshot });
  revalidatePath("/marketing/funnels");
  return { ok: true, message: "Published. Your funnel is live.", liveAt, version: data?.[0]?.updated_at };
}

export async function unpublishFunnelAction(funnelId: string): Promise<{ ok: boolean; message: string; version?: string }> {
  if (!id.safeParse(funnelId).success) return { ok: false, message: "Unknown funnel." };
  if (!(await getViewer())) return { ok: false, message: "Your session expired. Sign in again in another tab." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("funnels").update({ published: false }).eq("id", funnelId).select("updated_at");
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/marketing/funnels");
  return { ok: true, message: "Unpublished. Visitors now see \"page not found\".", version: data?.[0]?.updated_at };
}

export async function listVersionsAction(funnelId: string): Promise<VersionRow[]> {
  if (!id.safeParse(funnelId).success || !(await getViewer())) return [];
  const supabase = await createClient();
  const { data } = await supabase.from("funnel_versions").select("id, kind, label, created_at").eq("funnel_id", funnelId).order("created_at", { ascending: false }).limit(50);
  return (data ?? []) as VersionRow[];
}

export async function createVersionAction(funnelId: string, label: string): Promise<{ ok: boolean; message: string }> {
  if (!id.safeParse(funnelId).success || !(await getViewer())) return { ok: false, message: "Sign in again, then try again." };
  const supabase = await createClient();
  const { data: f } = await supabase.from("funnels").select("title, theme, product, pages").eq("id", funnelId).maybeSingle();
  const snap = f && snapshotOf(f);
  if (!f || !snap) return { ok: false, message: "Unknown funnel." };
  const { error } = await supabase.from("funnel_versions").insert({ funnel_id: funnelId, kind: "manual", label: label.trim().slice(0, 80) || null, snapshot: { ...snap, title: f.title } });
  return error ? { ok: false, message: friendlyError(error) } : { ok: true, message: "Version saved." };
}

async function loadVersion(supabase: Awaited<ReturnType<typeof createClient>>, funnelId: string, versionId: string) {
  const { data } = await supabase.from("funnel_versions").select("snapshot").eq("id", versionId).eq("funnel_id", funnelId).maybeSingle();
  return data ? snapshotOf(data.snapshot) : null;
}

/** Puts an older version back into the draft. The draft you had is kept as a version first, so nothing is lost. */
export async function restoreVersionAction(funnelId: string, versionId: string): Promise<{ ok: boolean; message: string; snapshot?: Snapshot; version?: string }> {
  if (!id.safeParse(funnelId).success || !id.safeParse(versionId).success) return { ok: false, message: "Unknown version." };
  if (!(await getViewer())) return { ok: false, message: "Your session expired. Sign in again in another tab." };
  const supabase = await createClient();
  const snap = await loadVersion(supabase, funnelId, versionId);
  if (!snap) return { ok: false, message: "That version could not be read." };
  const { data: cur } = await supabase.from("funnels").select("title, theme, product, pages").eq("id", funnelId).maybeSingle();
  const curSnap = cur && snapshotOf(cur);
  if (cur && curSnap) await supabase.from("funnel_versions").insert({ funnel_id: funnelId, kind: "restore", label: "Before restoring an older version", snapshot: { ...curSnap, title: cur.title } });
  const { data, error } = await supabase.from("funnels").update({ product: snap.product, theme: snap.theme, pages: snap.pages, ...(snap.title ? { title: snap.title } : {}) }).eq("id", funnelId).select("updated_at");
  if (error) return { ok: false, message: friendlyError(error) };
  return { ok: true, message: "Restored into your draft. Publish when you are happy with it.", snapshot: snap, version: data?.[0]?.updated_at };
}

/** Makes an older published (or saved) version the live one again, without touching the draft. */
export async function rollbackLiveAction(funnelId: string, versionId: string): Promise<{ ok: boolean; message: string; liveAt?: string }> {
  if (!id.safeParse(funnelId).success || !id.safeParse(versionId).success) return { ok: false, message: "Unknown version." };
  if (!(await getViewer())) return { ok: false, message: "Your session expired. Sign in again in another tab." };
  const supabase = await createClient();
  const snap = await loadVersion(supabase, funnelId, versionId);
  if (!snap) return { ok: false, message: "That version could not be read." };
  const liveAt = new Date().toISOString();
  const { error } = await supabase.from("funnels").update({ live: snap, live_at: liveAt, published: true }).eq("id", funnelId);
  if (error) return { ok: false, message: friendlyError(error) };
  await supabase.from("funnel_versions").insert({ funnel_id: funnelId, kind: "publish", label: "Rolled back to an earlier version", snapshot: snap });
  revalidatePath("/marketing/funnels");
  return { ok: true, message: "Rolled back. The earlier version is live again.", liveAt };
}

/** When a conflict is found, the member can keep their own edits as a separate funnel. */
export async function saveAsCopyAction(funnelId: string, payload: string): Promise<{ ok: boolean; message: string; id?: string }> {
  if (!id.safeParse(funnelId).success || !(await getViewer())) return { ok: false, message: "Sign in again, then try again." };
  let raw: Record<string, unknown> = {};
  try { raw = payload.length < 600_000 ? JSON.parse(payload) : {}; } catch { return { ok: false, message: "Could not read your changes." }; }
  const snap = snapshotOf(raw);
  if (!snap) return { ok: false, message: "Nothing to save." };
  const supabase = await createClient();
  const title = `${String(raw.title ?? "Funnel").slice(0, 70)} (my edits)`;
  const { data: slug } = await supabase.rpc("suggest_funnel_slug", { p_hint: title });
  const { data, error } = await supabase.from("funnels").insert({ title, slug: slug as string, product: snap.product, theme: snap.theme, pages: snap.pages, published: false }).select("id").single();
  if (error || !data) return { ok: false, message: friendlyError(error, "Could not save a copy.") };
  revalidatePath("/marketing/funnels");
  return { ok: true, message: "Saved as a new funnel.", id: data.id };
}

/** Asks the AI to change the funnel (or redesign it). Returns the result for the builder to apply. */
export async function aiFunnelAction(funnelId: string, instruction: string, current: string, focusBlockId?: string): Promise<AiResult> {
  if (!id.safeParse(funnelId).success) return { ok: false, message: "Unknown funnel." };
  const viewer = await getViewer();
  if (!viewer) return { ok: false, message: "Your session expired. Sign in again in another tab, then try again." };
  const note = z.string().trim().min(3, "Tell the AI what to change.").max(1500).safeParse(instruction);
  if (!note.success) return { ok: false, message: note.error.issues[0]?.message ?? "Tell the AI what to change." };
  const supabase = await createClient();
  const { data: f } = await supabase.from("funnels").select("product, theme, pages").eq("id", funnelId).maybeSingle();
  if (!f) return { ok: false, message: "Unknown funnel." };
  let cur: { pages?: unknown; theme?: unknown; product?: unknown } = {};
  try { cur = current.length < 600_000 ? JSON.parse(current) : {}; } catch { /* fall back to saved */ }
  const draft = await reviseFunnel({
    product: cleanProduct(cur.product ?? f.product), theme: cleanTheme(cur.theme ?? f.theme), pages: cleanPages(cur.pages ?? f.pages),
    instruction: note.data, ownerName: viewer.profile.full_name, focusBlockId: focusBlockId && /^[a-z0-9]{4,12}$/i.test(focusBlockId) ? focusBlockId : undefined,
  });
  if ("error" in draft) return { ok: false, message: draft.error };
  return { ok: true, message: "Done. Not happy? Press Undo.", pages: draft.pages, theme: draft.theme };
}

export async function duplicateFunnelAction(funnelId: string) {
  if (!id.safeParse(funnelId).success) return;
  await requireViewer();
  const supabase = await createClient();
  const { data: f } = await supabase.from("funnels").select("title, product, theme, pages").eq("id", funnelId).maybeSingle();
  if (!f) return;
  const { data: slug } = await supabase.rpc("suggest_funnel_slug", { p_hint: `${f.title} copy` });
  const { data, error } = await supabase.from("funnels").insert({ title: `${f.title} (copy)`.slice(0, 80), slug: slug as string, product: f.product, theme: f.theme, pages: f.pages, published: false }).select("id").single();
  if (error || !data) return;
  revalidatePath("/marketing/funnels");
  redirect(`/builder/${data.id}`);
}

export async function deleteFunnelAction(funnelId: string) {
  if (!id.safeParse(funnelId).success) return;
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("funnels").delete().eq("id", funnelId);
  revalidatePath("/marketing/funnels");
  redirect("/marketing/funnels");
}

export async function deleteLeadAction(funnelId: string, leadId: string) {
  if (!id.safeParse(funnelId).success || !id.safeParse(leadId).success) return;
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("funnel_leads").delete().eq("id", leadId).eq("funnel_id", funnelId);
  revalidatePath(`/marketing/funnels/${funnelId}/leads`);
}
