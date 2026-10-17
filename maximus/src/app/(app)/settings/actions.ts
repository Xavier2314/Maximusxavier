"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { NOTIFICATION_TYPES } from "@/lib/notification-types";
import { friendlyError } from "@/lib/utils";

export type SettingsState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

export async function savePreferencesAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const time = z.string().regex(/^\d{2}:\d{2}$/).optional().or(z.literal(""));
  const parsed = z.object({ quiet_start: time, quiet_end: time }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Enter valid quiet hours." };
  const enabled = new Set(formData.getAll("types").map(String));
  const muted = NOTIFICATION_TYPES.map((t) => t.key).filter((k) => !enabled.has(k));
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("notification_preferences").upsert({
    user_id: user.id,
    push_enabled: formData.get("push_enabled") === "on",
    muted_types: muted,
    quiet_start: parsed.data.quiet_start || null,
    quiet_end: parsed.data.quiet_end || null,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/settings");
  return { ok: true, message: "Notification preferences saved." };
}

export async function savePrivacyAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const parsed = z.object({ birthday_visibility: z.enum(["private", "day_month", "full"]) }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Invalid choice." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("profiles").update({
    birthday_visibility: parsed.data.birthday_visibility,
    ai_memory_enabled: formData.get("ai_memory_enabled") === "on",
  }).eq("id", user.id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/settings");
  return { ok: true, message: "Privacy settings saved." };
}

export async function changePasswordAction(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  const parsed = z.object({
    password: z.string().min(8, "Use at least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/[0-9]/, "Include a number"),
    confirm_password: z.string(),
  }).refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Password updated." };
}

export async function signOutEverywhereAction() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "global" });
  redirect("/login");
}
