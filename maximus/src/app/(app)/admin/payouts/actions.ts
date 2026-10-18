"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createTransfer, isFlutterwaveConfigured, settleTransfer } from "@/lib/flutterwave";
import { dispatchPushSoon } from "@/lib/push";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type Result = { ok: boolean; message: string };

/** Approve, then send through Flutterwave. If Flutterwave refuses, the payout is marked failed and the member's hold is released. */
export async function approvePayoutAction(id: string, note?: string): Promise<Result> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Invalid." };
  if (!isFlutterwaveConfigured()) return { ok: false, message: "Flutterwave isn't connected." };
  const supabase = await createClient();
  const { data: p, error } = await supabase.rpc("decide_payout", { p_id: id, p_approve: true, p_note: note ?? null });
  if (error || !p) return { ok: false, message: friendlyError(error, error?.message) };
  const row = p as { reference: string; bank_code: string; account_number: string; amount: number; narration: string | null; account_name: string };
  const admin = createAdminClient();
  const t = await createTransfer({
    reference: row.reference, bankCode: row.bank_code, accountNumber: row.account_number, amount: Number(row.amount),
    narration: row.narration ? `Maximus: ${row.narration}` : "Maximus wallet payout",
  });
  if (!t.ok) {
    await admin.rpc("finish_payout", { p_reference: row.reference, p_success: false, p_provider_id: t.id, p_message: t.message });
    revalidatePath("/admin/payouts");
    dispatchPushSoon();
    const hint = /whitelist/i.test(t.message) ? " Set up the static-IP proxy (FLUTTERWAVE_PROXY_URL) and whitelist its IPs in Flutterwave." : "";
    return { ok: false, message: `Flutterwave refused the transfer: ${t.message}.${hint} The member's money was released back to their wallet.` };
  }
  await admin.rpc("mark_payout_sent", { p_reference: row.reference, p_provider_id: t.id, p_message: t.status });
  if (t.status === "SUCCESSFUL" || t.status === "FAILED") await settleTransfer({ reference: row.reference, transferId: t.id });
  revalidatePath("/admin/payouts");
  dispatchPushSoon();
  return { ok: true, message: `Sent to Flutterwave (₦${Number(row.amount).toLocaleString()} to ${row.account_name}). It completes when the bank confirms.` };
}

export async function rejectPayoutAction(id: string, note: string): Promise<Result> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Invalid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_payout", { p_id: id, p_approve: false, p_note: note || null });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  revalidatePath("/admin/payouts");
  dispatchPushSoon();
  return { ok: true, message: "Rejected. The member's money is back in their wallet." };
}

export async function refreshPayoutAction(reference: string, transferId: number | null): Promise<Result> {
  const supabase = await createClient();
  const { data: ok } = await supabase.rpc("is_payout_approver");
  if (!ok) return { ok: false, message: "Not allowed." };
  try {
    const r = await settleTransfer({ reference, transferId });
    revalidatePath("/admin/payouts");
    return { ok: true, message: r === "pending" ? "Still processing at the bank." : `Status: ${r}.` };
  } catch {
    return { ok: false, message: "Couldn't reach Flutterwave. Try again shortly." };
  }
}
