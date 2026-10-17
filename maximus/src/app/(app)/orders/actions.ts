"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

export type OrderState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const money = (msg: string) => z.preprocess((v) => (v === "" || v == null ? undefined : Number(String(v).replace(/,/g, ""))),
  z.number({ invalid_type_error: msg, required_error: msg }).min(0, msg).max(1e12));

const schema = z.object({
  member_id: z.string().uuid(),
  customer_name: z.string().trim().max(120).optional(),
  amount: money("Enter the order amount"),
  business_volume: money("Enter a valid number").optional(),
  category: z.string().trim().max(80).optional(),
  status: z.enum(["pending", "confirmed", "delivered", "cancelled"]),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  notes: z.string().trim().max(1000).optional(),
});

export async function recordOrderAction(_prev: OrderState, formData: FormData): Promise<OrderState> {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = await supabase.from("orders").insert({
    ...v, recorded_by: user.id,
    customer_name: v.customer_name || null, category: v.category || null, notes: v.notes || null,
    business_volume: v.business_volume ?? null,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: true, message: "Order recorded. Your sponsor has been notified." };
}

export async function updateOrderStatusAction(id: string, status: "pending" | "confirmed" | "delivered" | "cancelled") {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/orders");
  return { ok: true, message: "Status updated." };
}
