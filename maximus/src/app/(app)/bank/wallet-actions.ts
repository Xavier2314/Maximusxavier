"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isFlutterwaveConfigured, resolveAccount } from "@/lib/flutterwave";
import { dispatchPushSoon } from "@/lib/push";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type Result = { ok: boolean; message: string };
const money = z.preprocess((v) => Number(String(v ?? "").replace(/,/g, "")), z.number().positive().max(5000000));
const kind = z.enum(["savings", "contributions"]);

function done(message: string): Result {
  revalidatePath("/bank");
  revalidatePath("/finance");
  dispatchPushSoon();
  return { ok: true, message };
}

export async function setPinAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const pin = String(formData.get("pin") ?? ""), confirm = String(formData.get("confirm") ?? ""), old = String(formData.get("old") ?? "");
  if (!/^\d{4}$/.test(pin)) return { ok: false, message: "Your PIN must be 4 digits." };
  if (pin !== confirm) return { ok: false, message: "The two PINs don't match." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_wallet_pin", { p_new: pin, p_old: old || null });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  revalidatePath("/bank");
  return { ok: true, message: "PIN saved. Keep it private." };
}

export async function checkAccountAction(accountNumber: string, bankCode: string): Promise<{ ok: boolean; name?: string; message?: string }> {
  if (!/^\d{10}$/.test(accountNumber) || !/^[0-9A-Za-z]{2,10}$/.test(bankCode)) return { ok: false, message: "Enter a 10-digit account number and choose the bank." };
  if (!isFlutterwaveConfigured()) return { ok: false, message: "Bank transfers aren't switched on yet." };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const name = await resolveAccount(accountNumber, bankCode);
  return name ? { ok: true, name } : { ok: false, message: "We couldn't find that account. Check the number and bank." };
}

export async function requestPayoutAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = z.object({
    account: kind, amount: money, recipient_type: z.enum(["self", "other"]),
    bank_code: z.string().regex(/^[0-9A-Za-z]{2,10}$/, "Choose the bank"), bank_name: z.string().trim().min(2).max(120),
    account_number: z.string().regex(/^\d{10}$/, "Account numbers have 10 digits"), narration: z.string().trim().max(100).optional(),
    pin: z.string().regex(/^\d{4}$/, "Enter your 4-digit PIN"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  if (!isFlutterwaveConfigured()) return { ok: false, message: "Bank transfers aren't switched on yet." };
  const v = parsed.data;
  // Never trust the name from the browser: ask the bank again.
  const accountName = await resolveAccount(v.account_number, v.bank_code);
  if (!accountName) return { ok: false, message: "We couldn't confirm that account with the bank. Check the details." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("request_payout", {
    p_kind: v.account, p_amount: v.amount, p_recipient_type: v.recipient_type, p_bank_code: v.bank_code, p_bank_name: v.bank_name,
    p_account_number: v.account_number, p_account_name: accountName, p_narration: v.narration ?? null, p_pin: v.pin,
  });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  return done(`Request sent: ₦${v.amount.toLocaleString()} to ${accountName}. The money is on hold until it's approved and sent.`);
}

export async function memberNameAction(code: string): Promise<string | null> {
  if (!/^[A-Za-z]{1,4}-?\d{3,8}$/.test(code.trim())) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("member_name_by_code", { p_code: code.trim() });
  return (data as string | null) ?? null;
}

export async function sendToMemberAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = z.object({
    code: z.string().trim().min(3).max(20), amount: money, account: kind, note: z.string().trim().max(100).optional(),
    pin: z.string().regex(/^\d{4}$/, "Enter your 4-digit PIN"),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const v = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_to_member", { p_code: v.code, p_amount: v.amount, p_kind: v.account, p_note: v.note ?? null, p_pin: v.pin });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  return done(`₦${v.amount.toLocaleString()} sent to ${data as string}.`);
}

export async function lockSavingsAction(_prev: Result | null, formData: FormData): Promise<Result> {
  const parsed = z.object({
    amount: money, unlock_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an unlock date"), reason: z.string().trim().max(120).optional(),
  }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.rpc("lock_savings", { p_amount: v.amount, p_unlock_on: v.unlock_on, p_reason: v.reason ?? null });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  return done(`₦${v.amount.toLocaleString()} locked until ${v.unlock_on}.`);
}

export async function cancelPayoutAction(id: string): Promise<Result> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Invalid." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_payout", { p_id: id });
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  return done("Request cancelled. The money is back in your wallet.");
}
