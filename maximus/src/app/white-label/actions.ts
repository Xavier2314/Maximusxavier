"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { env } from "@/lib/env";
import { createCheckout, isFlutterwaveConfigured } from "@/lib/flutterwave";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type CompanyState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Pick a colour");
const schema = z.object({
  company_name: z.string().trim().min(2, "Enter your company name").max(60),
  primary_color: hex,
  accent_color: hex,
  tier: z.enum(["standard", "premium"]).default("standard"),
  full_name: z.string().trim().min(2, "Enter your full name").max(120).optional(),
  email: z.string().trim().toLowerCase().email("Enter a valid email").optional(),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/, "Enter a valid phone number").optional(),
  password: z.string().min(8, "Use at least 8 characters").regex(/[A-Za-z]/, "Include a letter").regex(/[0-9]/, "Include a number").optional(),
});

/** Public sign-up: create the company admin's account (if needed), then pay for the branded company app. */
export async function startCompanyAction(_: CompanyState, form: FormData): Promise<CompanyState> {
  if (!isFlutterwaveConfigured()) return { ok: false, message: "Online payments aren't switched on yet. Please contact us." };
  const parsed = schema.safeParse(Object.fromEntries([...form.entries()].filter(([, v]) => v !== "")));
  if (!parsed.success) return { ok: false, message: "Please check the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const supabase = await createClient();
  let { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    if (!v.full_name || !v.email || !v.phone || !v.password) {
      return { ok: false, message: "Fill in your name, email, phone and a password to create your admin account." };
    }
    const created = await createAdminClient().auth.admin.createUser({
      email: v.email, password: v.password, email_confirm: true,
      user_metadata: { full_name: v.full_name, phone: v.phone, whatsapp: v.phone, privacy_accepted_at: new Date().toISOString() },
    });
    if (created.error) {
      if (/already (been )?registered|already exists/i.test(created.error.message)) {
        return { ok: false, message: "That email already has an account. Sign in first, then open this link again.", errors: { email: ["Email already registered"] } };
      }
      return { ok: false, message: friendlyError(created.error, created.error.message) };
    }
    const signedIn = await supabase.auth.signInWithPassword({ email: v.email, password: v.password });
    if (signedIn.error) return { ok: false, message: "Your account was created. Sign in, then open this link again to pay." };
    user = signedIn.data.user;
  }

  const { data, error } = await supabase.rpc("start_company_signup", { p_company: v.company_name, p_primary: v.primary_color, p_accent: v.accent_color, p_tier: v.tier });
  const row = (data as { tx_ref: string; amount: number }[] | null)?.[0];
  if (error || !row) return { ok: false, message: friendlyError(error, error?.message), errors: { company_name: [error?.message ?? ""] } };
  const { data: profile } = await supabase.from("profiles").select("full_name, phone, email").eq("id", user!.id).single();

  let link: string;
  try {
    link = await createCheckout({
      txRef: row.tx_ref, amount: Number(row.amount), email: profile?.email ?? user!.email ?? "", name: profile?.full_name ?? v.company_name,
      phone: profile?.phone ?? null, title: `${v.company_name} · ${v.tier === "premium" ? "Premium" : "Standard"} branded app`, description: v.tier === "premium" ? "Premium white-label company app" : "White-label company app",
      redirectUrl: `${env.siteUrl}/api/payments/flutterwave/return`,
    });
  } catch (e) {
    console.error("[company-whitelabel]", e);
    return { ok: false, message: "We couldn't reach Flutterwave. Please try again in a minute." };
  }
  redirect(link);
}
