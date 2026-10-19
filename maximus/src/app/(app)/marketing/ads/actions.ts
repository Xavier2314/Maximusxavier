"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getViewer, requireViewer } from "@/lib/auth";
import { draftAdPlan } from "@/lib/ad-ai";
import { cleanInputs, cleanPlan } from "@/lib/ad-plan";
import { cleanPages, cleanProduct } from "@/lib/funnels";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type State = { ok: boolean; message: string } | null;
const id = z.string().uuid();

export async function createAdPlanAction(_: State, form: FormData): Promise<State> {
  const viewer = await requireViewer();
  const funnelId = String(form.get("funnelId") ?? "");
  if (!id.safeParse(funnelId).success) return { ok: false, message: "Unknown funnel." };
  const budget = Number(String(form.get("dailyBudgetNgn") ?? "").replace(/[^\d.]/g, ""));
  const inputs = cleanInputs({
    objective: form.get("objective"), dailyBudgetNgn: budget, areas: form.get("areas"), offer: form.get("offer"),
    healthProduct: form.get("healthProduct") === "on", registrationNumber: form.get("registrationNumber"),
  });
  if (!Number.isFinite(budget) || budget < 1000) return { ok: false, message: "Enter a daily budget of at least ₦1,000." };
  if (!inputs.areas) return { ok: false, message: "Say where you deliver, for example “Lagos and Abuja”." };
  if (inputs.healthProduct && inputs.registrationNumber.length < 4) return { ok: false, message: "For a food, supplement or herbal product, add its NAFDAC registration number. Ads for these products are often rejected without it." };

  const supabase = await createClient();
  const { data: f } = await supabase.from("funnels").select("title, product, pages").eq("id", funnelId).maybeSingle();
  if (!f) return { ok: false, message: "Unknown funnel." };
  const product = cleanProduct(f.product);
  if (!product.name) return { ok: false, message: "Add the product name in the funnel first." };

  const plan = await draftAdPlan({ product, inputs, funnelTitle: f.title as string, pageCount: cleanPages(f.pages).length });
  if ("error" in plan) return { ok: false, message: plan.error };
  const title = `${product.name}: ${inputs.objective === "whatsapp" ? "WhatsApp" : inputs.objective} ads`.slice(0, 120);
  const { data, error } = await supabase.from("funnel_ad_plans").insert({ funnel_id: funnelId, title, plan }).select("id").single();
  if (error || !data) return { ok: false, message: friendlyError(error, "Could not save the plan.") };
  void viewer;
  revalidatePath("/marketing/ads");
  redirect(`/marketing/ads/${funnelId}?plan=${data.id}`);
}

export async function saveAdPlanAction(planId: string, payload: string): Promise<State> {
  if (!id.safeParse(planId).success) return { ok: false, message: "Unknown plan." };
  if (!(await getViewer())) return { ok: false, message: "Your session expired. Sign in again in another tab, then save." };
  let raw: unknown;
  try { raw = payload.length < 120_000 ? JSON.parse(payload) : null; } catch { raw = null; }
  const plan = cleanPlan(raw);
  if (!plan) return { ok: false, message: "Could not read the plan." };
  const supabase = await createClient();
  const { error } = await supabase.from("funnel_ad_plans").update({ plan }).eq("id", planId);
  return error ? { ok: false, message: friendlyError(error) } : { ok: true, message: "Saved" };
}

export async function deleteAdPlanAction(funnelId: string, planId: string) {
  if (!id.safeParse(planId).success || !id.safeParse(funnelId).success) return;
  await requireViewer();
  const supabase = await createClient();
  await supabase.from("funnel_ad_plans").delete().eq("id", planId);
  revalidatePath("/marketing/ads");
  redirect(`/marketing/ads/${funnelId}`);
}
