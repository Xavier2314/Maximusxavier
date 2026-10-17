"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dispatchPushSoon } from "@/lib/push";
import { friendlyError } from "@/lib/utils";

export type FinanceState = { ok: boolean; message: string; errors?: Record<string, string[] | undefined> } | null;

const RECEIPT_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

const submitSchema = z.object({
  kind: z.enum(["deposit", "contribution", "withdrawal"]),
  account: z.enum(["savings", "contributions"]),
  amount: z.preprocess((v) => Number(String(v ?? "").replace(/,/g, "")),
    z.number({ invalid_type_error: "Enter an amount" }).positive("Amount must be greater than zero").max(1e10)),
  occurred_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a date"),
  note: z.string().trim().max(1000).optional(),
});

export async function submitTransactionAction(_prev: FinanceState, formData: FormData): Promise<FinanceState> {
  const parsed = submitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  if (v.kind === "contribution" && v.account !== "contributions") return { ok: false, message: "Contributions go to the contributions account." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };

  let receiptPath: string | null = null;
  const file = formData.get("receipt");
  if (file instanceof File && file.size > 0) {
    if (!RECEIPT_TYPES.includes(file.type)) return { ok: false, message: "Receipts must be JPG, PNG, WebP or PDF.", errors: { receipt: ["Unsupported file type"] } };
    if (file.size > 5 * 1024 * 1024) return { ok: false, message: "Receipts must be under 5 MB.", errors: { receipt: ["File too large"] } };
    const ext = file.type === "application/pdf" ? "pdf" : file.type.split("/")[1].replace("jpeg", "jpg");
    receiptPath = `${user.id}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}.${ext}`;
    const { error: upErr } = await supabase.storage.from("receipts").upload(receiptPath, file, { contentType: file.type });
    if (upErr) return { ok: false, message: "We couldn't upload your receipt. Please try again." };
  }

  const { error } = await supabase.rpc("submit_transaction", {
    p_kind: v.kind, p_amount: v.amount, p_account_kind: v.account,
    p_note: v.note || null, p_receipt_path: receiptPath, p_occurred_on: v.occurred_on,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/finance");
  revalidatePath("/dashboard");
  return { ok: true, message: v.kind === "withdrawal"
    ? "Withdrawal request submitted for approval."
    : "Submitted. It will count towards your balance once an administrator confirms it." };
}

export async function setSavingsTargetAction(_prev: FinanceState, formData: FormData): Promise<FinanceState> {
  const amount = z.preprocess((v) => (v === "" ? null : Number(String(v).replace(/,/g, ""))), z.number().min(0).max(1e12).nullable())
    .safeParse(formData.get("target_amount"));
  const accountId = z.string().uuid().safeParse(formData.get("account_id"));
  if (!amount.success || !accountId.success) return { ok: false, message: "Enter a valid target." };
  const supabase = await createClient();
  const { error } = await supabase.from("financial_accounts").update({ target_amount: amount.data }).eq("id", accountId.data);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/finance");
  return { ok: true, message: "Target updated." };
}

export async function shareFinancesAction(viewerId: string, share: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { error } = share
    ? await supabase.from("financial_access_grants").insert({ member_id: user.id, viewer_id: viewerId, granted_by: user.id })
    : await supabase.from("financial_access_grants").delete().eq("member_id", user.id).eq("viewer_id", viewerId);
  if (error && error.code !== "23505") return { ok: false, message: friendlyError(error) };
  revalidatePath("/finance");
  return { ok: true, message: share ? "Shared." : "Access removed." };
}

export async function decideTransactionAction(id: string, approve: boolean, reason?: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_transaction", { p_id: id, p_approve: approve, p_reason: reason || null });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/admin/approvals");
  dispatchPushSoon();
  return { ok: true, message: approve ? "Confirmed." : "Rejected." };
}

export async function recordAdjustmentAction(_prev: FinanceState, formData: FormData): Promise<FinanceState> {
  const schema = z.object({
    member_code: z.string().trim().min(3, "Enter a Member ID"),
    account: z.enum(["savings", "contributions"]),
    direction: z.enum(["1", "-1"]),
    amount: z.preprocess((v) => Number(String(v ?? "").replace(/,/g, "")), z.number().positive("Amount must be greater than zero")),
    note: z.string().trim().min(5, "Explain the reason for this adjustment").max(1000),
  });
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: "Please fix the highlighted fields.", errors: parsed.error.flatten().fieldErrors };
  const v = parsed.data;
  const supabase = await createClient();
  const { data: member } = await supabase.from("profiles").select("id").ilike("member_id", v.member_code).maybeSingle();
  if (!member) return { ok: false, message: "Member not found.", errors: { member_code: ["Unknown Member ID"] } };
  const { error } = await supabase.rpc("record_adjustment", {
    p_user: member.id, p_account_kind: v.account, p_direction: Number(v.direction), p_amount: v.amount, p_note: v.note,
  });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/admin/approvals");
  dispatchPushSoon();
  return { ok: true, message: "Adjustment recorded in the ledger and audit log." };
}
