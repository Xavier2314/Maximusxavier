"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dispatchPushSoon } from "@/lib/push";
import { formatMoney, friendlyError } from "@/lib/utils";

export type OrderState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const money = (msg: string) => z.preprocess((v) => (v === "" || v == null ? undefined : Number(String(v).replace(/,/g, ""))),
  z.number({ invalid_type_error: msg, required_error: msg }).min(0, msg).max(1e12));

const PLATFORM_LABEL: Record<string, string> = { fiverr: "Fiverr", upwork: "Upwork", freelance_other: "Freelance", product: "Product sale", other: "Other" };
const FILE_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const schema = z.object({
  member_id: z.string().uuid(),
  platform: z.enum(["product", "fiverr", "upwork", "freelance_other", "other"]),
  description: z.string().trim().max(2000).optional(),
  customer_name: z.string().trim().max(120).optional(),
  amount: money("Enter the order amount"),
  business_volume: money("Enter a valid number").optional(),
  category: z.string().trim().max(80).optional(),
  status: z.enum(["pending", "confirmed", "delivered", "cancelled"]),
  order_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  send_to_leaders: z.literal("1").optional(),
});

export async function recordOrderAction(_prev: OrderState, formData: FormData): Promise<OrderState> {
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const { send_to_leaders, ...v } = parsed.data;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  let attachmentPath: string | null = null;
  const file = formData.get("attachment");
  if (file instanceof File && file.size > 0) {
    if (!FILE_TYPES.includes(file.type)) return { ok: false, message: "Screenshots must be JPG, PNG, WebP or PDF.", errors: { attachment: ["Unsupported file type"] } };
    if (file.size > 10 * 1024 * 1024) return { ok: false, message: "Files must be under 10 MB.", errors: { attachment: ["File too large"] } };
    const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1];
    attachmentPath = `${user.id}/orders/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("attachments").upload(attachmentPath, file, { contentType: file.type });
    if (upErr) return { ok: false, message: "We couldn't upload the screenshot. Please try again." };
  }

  const { data: order, error } = await supabase.from("orders").insert({
    ...v, recorded_by: user.id,
    customer_name: v.customer_name || null, description: v.description || null,
    category: v.platform === "product" ? v.category || null : PLATFORM_LABEL[v.platform],
    notes: v.description ? v.description.slice(0, 1000) : null,
    business_volume: v.business_volume ?? null, attachment_path: attachmentPath,
  }).select("id").single();
  if (error || !order) return { ok: false, message: friendlyError(error) };

  let sent = "";
  if (send_to_leaders && v.member_id === user.id) {
    const { error: shareErr } = await supabase.rpc("share_with_leaders", {
      p_kind: "order", p_item: order.id,
      p_title: `New ${PLATFORM_LABEL[v.platform]} order · ${formatMoney(v.amount)}`,
      p_body: [`Platform: ${PLATFORM_LABEL[v.platform]}`, `Amount: ${formatMoney(v.amount)}`, `Date: ${v.order_date}`,
        v.customer_name ? `Client: ${v.customer_name}` : "", v.description ? `\n${v.description}` : ""].filter(Boolean).join("\n"),
      p_relations: ["sponsor", "team_leader"], p_message: null, p_attachment: attachmentPath,
    });
    sent = shareErr ? "" : " Sent to your sponsor and team leader.";
  }
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  dispatchPushSoon();
  return { ok: true, message: `Order recorded.${sent}` };
}

export async function updateOrderStatusAction(id: string, status: "pending" | "confirmed" | "delivered" | "cancelled") {
  const supabase = await createClient();
  const { error } = await supabase.from("orders").update({ status }).eq("id", id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/orders");
  return { ok: true, message: "Status updated." };
}
