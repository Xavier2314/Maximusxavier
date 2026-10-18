"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export type AuthState = { ok?: boolean; message?: string; errors?: Record<string, string[] | undefined> } | null;

const phone = z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "Enter a valid phone number");

const registerSchema = z.object({
  full_name: z.string().trim().min(2, "Enter your full name").max(120),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone,
  whatsapp: phone,
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Enter your date of birth").refine((d) => {
    const age = (Date.now() - new Date(d).getTime()) / 31557600000;
    return age >= 16 && age <= 100;
  }, "You must be at least 16 years old"),
  gender: z.enum(["female", "male", "other", "prefer_not_to_say", ""]).optional(),
  business_rank: z.enum(
    ["distributor", "manager", "senior_manager", "executive_manager", "director", "emerald_director"],
    { errorMap: () => ({ message: "Choose your status" }) },
  ),
  office_id: z.string().uuid("Choose your office"),
  referral_code: z.string().trim().max(20).optional(),
  upline_member_id: z.string().trim().max(20).optional(),
  password: z.string().min(8, "Use at least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/[0-9]/, "Include a number"),
  confirm_password: z.string(),
  privacy: z.literal("on", { errorMap: () => ({ message: "You must accept the privacy policy" }) }),
  celebrate_birthday: z.string().optional(),
  timezone: z.string().max(64).optional(),
  upline_code: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{6,32}$/).optional().or(z.literal("")),
}).refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });

export async function registerAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  }
  const v = parsed.data;
  const supabase = await createClient();

  if (v.referral_code) {
    const { data } = await supabase.rpc("lookup_sponsor", { code: v.referral_code });
    if (!data || (data as unknown[]).length === 0) {
      return { message: "We couldn't find that sponsor.", errors: { referral_code: ["Unknown referral code or member ID"] } };
    }
  }

  const metadata = {
    full_name: v.full_name,
    phone: v.phone,
    whatsapp: v.whatsapp,
    date_of_birth: v.date_of_birth,
    gender: v.gender || null,
    office_id: v.office_id,
    referral_code: v.referral_code || null,
    upline_member_id: v.upline_member_id || null,
    privacy_accepted_at: new Date().toISOString(),
    birthday_visibility: v.celebrate_birthday === "on" ? "day_month" : "private",
    timezone: v.timezone || "Africa/Lagos",
  };

  // Create the account on the server, already confirmed, then sign in. This sends no
  // confirmation email, so Supabase's email rate limit can never block registration.
  let data: { user: { id: string } | null; session: unknown } = { user: null, session: null };
  let error: { message: string } | null = null;
  let createdConfirmed = false;
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const created = await createAdminClient().auth.admin.createUser({
      email: v.email, password: v.password, email_confirm: true, user_metadata: metadata,
    });
    if (created.error) {
      error = created.error;
    } else {
      createdConfirmed = true;
      const signedIn = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
      data = { user: created.data.user, session: signedIn.data.session };
    }
  } else {
    const res = await supabase.auth.signUp({
      email: v.email, password: v.password,
      options: { emailRedirectTo: `${env.siteUrl}/auth/callback?next=/onboarding`, data: metadata },
    });
    data = res.data;
    error = res.error;
  }

  if (error) {
    if (/already (been )?registered|already exists/i.test(error.message)) {
      return { message: "An account with this email already exists. Try signing in.", errors: { email: ["Email already registered"] } };
    }
    if (/sponsor|referral/i.test(error.message)) {
      return { message: "We couldn't find that sponsor.", errors: { referral_code: ["Unknown referral code or member ID"] } };
    }
    if (/rate limit/i.test(error.message)) {
      return { message: "Too many sign-ups at once. Please wait a minute and try again." };
    }
    if (/database error/i.test(error.message)) {
      return { message: "We couldn't create your account. Check your sponsor's code and office, then try again." };
    }
    return { message: error.message };
  }

  // Optional profile picture: only possible right away if email confirmation is off.
  const photo = formData.get("avatar");
  if (data.session && photo instanceof File && photo.size > 0 && data.user) {
    const ext = photo.type === "image/png" ? "png" : photo.type === "image/webp" ? "webp" : "jpg";
    const path = `${data.user.id}/avatar-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, photo, { contentType: photo.type, upsert: true });
    if (!upErr) {
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: pub.publicUrl }).eq("id", data.user.id);
    }
  }

  // The status chosen at signup (business_rank isn't on the handle_new_user trigger,
  // so it's set here once the member has a session and can update their own row).
  if (data.session && data.user) {
    const { error: rankErr } = await supabase.from("profiles").update({ business_rank: v.business_rank }).eq("id", data.user.id);
    if (rankErr) console.error("Setting business_rank failed", rankErr.message);
  }

  // Joining above an existing member with an upline invite (e.g. the founder's own sponsor).
  if (data.session && v.upline_code) {
    const { error: inviteErr } = await supabase.rpc("accept_upline_invite", { p_code: v.upline_code });
    if (inviteErr) console.error("Upline invite failed", inviteErr.message);
  }
  if (data.session) redirect("/onboarding");
  if (createdConfirmed) return { ok: true, message: "Your account is ready. Sign in with your email and password to continue." };
  return {
    ok: true,
    message: `Almost there! We sent a confirmation link to ${v.email}. Open it to activate your account — you can add your profile photo after signing in.`,
  };
}

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  password: z.string().min(1, "Enter your password"),
  next: z.string().optional(),
});

export async function loginAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: parsed.data.email, password: parsed.data.password });
  if (error) {
    if (/confirm/i.test(error.message)) return { message: "Please confirm your email first. Check your inbox for the link." };
    return { message: "Incorrect email or password." };
  }
  const next = parsed.data.next && parsed.data.next.startsWith("/") && !parsed.data.next.startsWith("//") ? parsed.data.next : "/dashboard";
  redirect(next);
}

export async function forgotPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = z.string().trim().toLowerCase().email().safeParse(formData.get("email"));
  if (!email.success) return { message: "Enter a valid email address.", errors: { email: ["Enter a valid email address"] } };
  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email.data, { redirectTo: `${env.siteUrl}/auth/callback?next=/reset-password` });
  // Same response whether or not the account exists, to avoid revealing members' emails.
  return { ok: true, message: "If an account exists for that email, a reset link is on its way." };
}

export async function resetPasswordAction(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const schema = z.object({
    password: z.string().min(8, "Use at least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/[0-9]/, "Include a number"),
    confirm_password: z.string(),
  }).refine((v) => v.password === v.confirm_password, { path: ["confirm_password"], message: "Passwords do not match" });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { message: "This reset link has expired. Request a new one." };
  redirect("/dashboard?password=updated");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
