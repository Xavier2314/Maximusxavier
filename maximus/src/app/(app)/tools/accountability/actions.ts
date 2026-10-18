"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { dispatchPushSoon } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type Result = { ok: boolean; message: string };
const uuid = z.string().uuid();
const PATH = "/tools/accountability";

function done(message: string): Result {
  revalidatePath(PATH);
  dispatchPushSoon();
  return { ok: true, message };
}

export async function requestPartnerAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const message = String(formData.get("message") ?? "").trim().slice(0, 300);
  if (!/^ACC-[A-Z0-9]{6}$/.test(code)) return { ok: false, message: "Codes look like ACC-X7K29P." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_partner", { p_code: code, p_message: message || null });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  return done("Request sent. They'll see it in their notifications.");
}

export async function respondPartnerAction(id: string, accept: boolean): Promise<Result> {
  if (!uuid.safeParse(id).success) return { ok: false, message: "Invalid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_partner", { p_id: id, p_accept: accept });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  return done(accept ? "You're now accountability partners." : "Done.");
}

export async function endPartnershipAction(id: string): Promise<Result> {
  if (!uuid.safeParse(id).success) return { ok: false, message: "Invalid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("end_partnership", { p_id: id });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  return done("Partnership ended.");
}

const sharingSchema = z.object({
  share_goals: z.boolean(), share_habits: z.boolean(), share_focus: z.boolean(), share_score: z.boolean(),
  checkin_morning: z.string().regex(/^\d{2}:\d{2}$/).nullable(), checkin_evening: z.string().regex(/^\d{2}:\d{2}$/).nullable(),
});

export async function saveSharingAction(partnershipId: string, input: z.input<typeof sharingSchema>): Promise<Result> {
  const parsed = sharingSchema.safeParse(input);
  if (!uuid.safeParse(partnershipId).success || !parsed.success) return { ok: false, message: "Check your settings." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("partner_sharing").update(parsed.data).eq("partnership_id", partnershipId).eq("user_id", user.id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(PATH);
  return { ok: true, message: "Sharing settings saved." };
}

export async function checkinAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = z.object({
    partnership_id: uuid, slot: z.enum(["morning", "evening"]), checkin_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    mood: z.coerce.number().int().min(1).max(5).optional().or(z.literal("")),
    plan: z.string().max(1000).optional(), done: z.string().max(1000).optional(), blockers: z.string().max(1000).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please check your check-in." };
  const v = parsed.data;
  if (!v.plan?.trim() && !v.done?.trim()) return { ok: false, message: v.slot === "morning" ? "Share your plan for today." : "Share what you got done." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("partner_checkins").upsert({
    partnership_id: v.partnership_id, user_id: user.id, slot: v.slot, checkin_date: v.checkin_date,
    mood: v.mood === "" || v.mood === undefined ? null : v.mood,
    plan: v.plan?.trim() || null, done: v.done?.trim() || null, blockers: v.blockers?.trim() || null,
  }, { onConflict: "partnership_id,user_id,checkin_date,slot" });
  if (error) return { ok: false, message: friendlyError(error) };
  return done("Check-in shared with your partner.");
}

export async function goalCommentAction(input: { goal_id: string; kind: "comment" | "encourage" | "request_update" | "deadline"; body?: string; proposed_deadline?: string }): Promise<Result> {
  const parsed = z.object({
    goal_id: uuid, kind: z.enum(["comment", "encourage", "request_update", "deadline"]),
    body: z.string().trim().max(1000).optional(), proposed_deadline: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false, message: "Check your message." };
  const v = parsed.data;
  if (v.kind === "comment" && !v.body) return { ok: false, message: "Write a comment first." };
  if (v.kind === "deadline" && !v.proposed_deadline) return { ok: false, message: "Choose a date." };
  const supabase = await createClient();
  const { error } = await supabase.from("goal_comments").insert({
    goal_id: v.goal_id, kind: v.kind,
    body: v.body || (v.kind === "encourage" ? "Keep going, you've got this! 💪" : v.kind === "request_update" ? "How is this going? Share an update." : null),
    proposed_deadline: v.kind === "deadline" ? v.proposed_deadline : null, proposal_status: v.kind === "deadline" ? "pending" : null,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/tools/goals");
  return done(v.kind === "deadline" ? "Deadline suggested. They decide." : "Sent.");
}

export async function respondDeadlineAction(commentId: string, accept: boolean): Promise<Result> {
  if (!uuid.safeParse(commentId).success) return { ok: false, message: "Invalid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("respond_deadline", { p_comment: commentId, p_accept: accept });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  revalidatePath("/tools/goals");
  return done(accept ? "Deadline updated." : "Suggestion declined.");
}
