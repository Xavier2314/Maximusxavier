"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import {
  aiStep, deliver, isGoogleConfigured, isWhatsAppConfigured, planFollowUp, searchSpotify, spotifyPreview,
  type SpotifyItem,
} from "@/lib/followup";
import { isSpotifyUrl, normalizePhone, type Prospect, type ProspectMessage } from "@/lib/prospects";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type ActionResult<T = undefined> = { ok: boolean; message: string; data?: T; errors?: Record<string, string[] | undefined> };

const STAGE = z.enum(["new", "contacted", "interested", "presentation", "follow_up", "joined", "customer", "not_now"]);
const CHANNEL = z.enum(["whatsapp", "email", "manual"]);

const prospectSchema = z.object({
  full_name: z.string().trim().min(2, "Enter their name").max(120),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  source: z.string().trim().max(120).optional().or(z.literal("")),
  notes: z.string().trim().max(4000).optional().or(z.literal("")),
  channel: CHANNEL.default("manual"),
  stage: STAGE.default("new"),
});

function cleanProspect(v: z.infer<typeof prospectSchema>) {
  return {
    full_name: v.full_name, phone: normalizePhone(v.phone), email: v.email || null,
    source: v.source || null, notes: v.notes || null, channel: v.channel, stage: v.stage,
  };
}

export async function createProspectAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const viewer = await requireViewer();
  const parsed = prospectSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const row = cleanProspect(parsed.data);
  if (parsed.data.phone && !row.phone) return { ok: false, message: "Please fix the highlighted fields.", errors: { phone: ["Enter a valid phone number"] } };
  const supabase = await createClient();
  const { data, error } = await supabase.from("prospects").insert({ ...row, owner_id: viewer.id }).select("id").single();
  if (error || !data) return { ok: false, message: friendlyError(error) };
  revalidatePath("/prospects");
  redirect(`/prospects/${data.id}`);
}

export async function updateProspectAction(_prev: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(formData.get("id"));
  const parsed = prospectSchema.safeParse(Object.fromEntries(formData));
  if (!id.success) return { ok: false, message: "Prospect not found." };
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const row = cleanProspect(parsed.data);
  if (parsed.data.phone && !row.phone) return { ok: false, message: "Please fix the highlighted fields.", errors: { phone: ["Enter a valid phone number"] } };
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").update(row).eq("id", id.data);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/prospects/${id.data}`);
  revalidatePath("/prospects");
  return { ok: true, message: "Saved" };
}

export async function setStageAction(id: string, stage: string): Promise<ActionResult> {
  const p = z.object({ id: z.string().uuid(), stage: STAGE }).safeParse({ id, stage });
  if (!p.success) return { ok: false, message: "Invalid stage." };
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").update({ stage: p.data.stage }).eq("id", p.data.id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/prospects");
  revalidatePath(`/prospects/${id}`);
  return { ok: true, message: "Moved" };
}

export async function deleteProspectAction(id: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Prospect not found." };
  const supabase = await createClient();
  const { error } = await supabase.from("prospects").delete().eq("id", id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/prospects");
  redirect("/prospects");
}

/** Loads a prospect through RLS so only its owner can act on it. */
async function ownProspect(id: string) {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("prospects").select("*").eq("id", id).eq("owner_id", viewer.id).maybeSingle<Prospect>();
  const { data: history } = data
    ? await supabase.from("prospect_messages").select("*").eq("prospect_id", id).order("created_at").returns<ProspectMessage[]>()
    : { data: [] as ProspectMessage[] };
  return { viewer, supabase, prospect: data, history: history ?? [] };
}

const attachmentSchema = z.string().url().refine(isSpotifyUrl, "Only Spotify links can be attached").optional().nullable();

export async function suggestMessagesAction(input: { id: string; situation?: string; attachment?: string | null }): Promise<ActionResult<string[]>> {
  const p = z.object({ id: z.string().uuid(), situation: z.string().max(1000).optional(), attachment: attachmentSchema }).safeParse(input);
  if (!p.success) return { ok: false, message: "Invalid request." };
  const { viewer, prospect, history } = await ownProspect(p.data.id);
  if (!prospect) return { ok: false, message: "Prospect not found." };
  try {
    const plan = await planFollowUp({
      prospect, history, memberName: viewer.profile.full_name, mode: "options",
      situation: p.data.situation, attachment: p.data.attachment,
    });
    return { ok: true, message: "Here are some options", data: plan.messages };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Maximus AI could not write a message." };
  }
}

/**
 * mode "auto": the platform sends it (WhatsApp Business number or the member's Gmail).
 * mode "logged": the member sent it from their own phone; we just record it.
 */
export async function sendMessageAction(input: { id: string; body: string; attachment?: string | null; mode: "auto" | "logged"; ai?: boolean }): Promise<ActionResult> {
  const p = z.object({
    id: z.string().uuid(), body: z.string().trim().min(1, "Write a message").max(4000),
    attachment: attachmentSchema, mode: z.enum(["auto", "logged"]), ai: z.boolean().optional(),
  }).safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Invalid message." };
  const { viewer, supabase, prospect, history } = await ownProspect(p.data.id);
  if (!prospect) return { ok: false, message: "Prospect not found." };
  if (prospect.opted_out && p.data.mode === "auto") return { ok: false, message: "This prospect asked not to be contacted." };

  const text = p.data.attachment && !p.data.body.includes(p.data.attachment) ? `${p.data.body}\n\n${p.data.attachment}` : p.data.body;
  let status: ProspectMessage["status"] = "logged";
  let externalId: string | null = null;
  let errorText: string | null = null;
  if (p.data.mode === "auto") {
    const sent = await deliver(createAdminClient(), prospect, viewer.profile.full_name, text, history);
    status = sent.ok ? "sent" : "failed";
    if (sent.ok) externalId = sent.externalId; else errorText = sent.error;
  }
  const { error } = await supabase.from("prospect_messages").insert({
    prospect_id: prospect.id, owner_id: viewer.id, direction: "out", channel: p.data.mode === "auto" ? prospect.channel : "manual",
    body: text, status, ai_generated: Boolean(p.data.ai), attachment_url: p.data.attachment ?? null,
    external_id: externalId, error: errorText,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  if (status !== "failed") {
    await supabase.from("prospects").update({
      last_contacted_at: new Date().toISOString(),
      ...(prospect.stage === "new" ? { stage: "contacted" } : {}),
    }).eq("id", prospect.id);
  }
  revalidatePath(`/prospects/${prospect.id}`);
  revalidatePath("/prospects");
  return status === "failed" ? { ok: false, message: errorText ?? "Could not send." } : { ok: true, message: status === "sent" ? "Sent" : "Saved to the conversation" };
}

export async function logReplyAction(input: { id: string; body: string }): Promise<ActionResult> {
  const p = z.object({ id: z.string().uuid(), body: z.string().trim().min(1, "Paste what they said").max(4000) }).safeParse(input);
  if (!p.success) return { ok: false, message: p.error.issues[0]?.message ?? "Invalid reply." };
  const { viewer, supabase, prospect } = await ownProspect(p.data.id);
  if (!prospect) return { ok: false, message: "Prospect not found." };
  const { error } = await supabase.from("prospect_messages").insert({
    prospect_id: prospect.id, owner_id: viewer.id, direction: "in", channel: "manual", body: p.data.body, status: "received",
  });
  if (error) return { ok: false, message: friendlyError(error) };
  await supabase.from("prospects").update({ last_reply_at: new Date().toISOString() }).eq("id", prospect.id);
  revalidatePath(`/prospects/${prospect.id}`);
  return { ok: true, message: "Reply added" };
}

/** Turn AI follow-up on (sends the first message now when the channel allows) or off. */
export async function setAutopilotAction(input: { id: string; on: boolean }): Promise<ActionResult> {
  const p = z.object({ id: z.string().uuid(), on: z.boolean() }).safeParse(input);
  if (!p.success) return { ok: false, message: "Invalid request." };
  const { supabase, prospect } = await ownProspect(p.data.id);
  if (!prospect) return { ok: false, message: "Prospect not found." };
  if (!p.data.on) {
    await supabase.from("prospects").update({ autopilot: false, next_follow_up_at: null }).eq("id", prospect.id);
    revalidatePath(`/prospects/${prospect.id}`);
    return { ok: true, message: "AI follow-up turned off" };
  }
  if (prospect.opted_out) return { ok: false, message: "This prospect asked not to be contacted." };
  if (prospect.channel === "manual") return { ok: false, message: "Choose WhatsApp or Email as the channel first, so Maximus AI can send messages." };
  if (prospect.channel === "whatsapp" && (!isWhatsAppConfigured() || !prospect.phone)) {
    return { ok: false, message: isWhatsAppConfigured() ? "Add their WhatsApp number first." : "WhatsApp isn't connected to Maximus yet. An administrator needs to set it up." };
  }
  if (prospect.channel === "email" && (!isGoogleConfigured() || !prospect.email)) {
    return { ok: false, message: isGoogleConfigured() ? "Add their email address first." : "Gmail sending isn't set up yet. An administrator needs to add Google keys." };
  }
  const { error } = await supabase.from("prospects").update({ autopilot: true, next_follow_up_at: new Date().toISOString() }).eq("id", prospect.id);
  if (error) return { ok: false, message: friendlyError(error) };
  try {
    await aiStep(createAdminClient(), { ...prospect, autopilot: true }, "next");
  } catch (e) {
    return { ok: true, message: `AI follow-up is on. The first message will go out with the next run (${e instanceof Error ? e.message : "AI unavailable"}).` };
  }
  revalidatePath(`/prospects/${prospect.id}`);
  revalidatePath("/prospects");
  return { ok: true, message: "AI follow-up is on. The first message has been sent." };
}

export async function spotifySearchAction(q: string): Promise<ActionResult<SpotifyItem[]>> {
  await requireViewer();
  const query = z.string().trim().min(2).max(100).safeParse(q);
  if (!query.success) return { ok: false, message: "Type at least 2 characters." };
  if (isSpotifyUrl(query.data)) {
    const prev = await spotifyPreview(query.data);
    return prev
      ? { ok: true, message: "", data: [{ title: prev.title, subtitle: "Spotify", url: query.data, image: prev.image, kind: "link" }] }
      : { ok: false, message: "Couldn't load that Spotify link." };
  }
  const items = await searchSpotify(query.data);
  return items.length ? { ok: true, message: "", data: items } : { ok: false, message: "No results. You can also paste a Spotify link." };
}
