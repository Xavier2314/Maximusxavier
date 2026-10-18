"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AI_MODEL, aiClient, isAiConfigured } from "@/lib/ai";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";
import type { WhiteLabelFee } from "@/lib/white-label";

export type WlState = { ok: boolean; message: string } | null;

const RECEIPT_TOOL = {
  name: "read_receipt",
  description: "What a bank transfer receipt or screenshot shows.",
  input_schema: {
    type: "object" as const,
    properties: {
      is_transfer_receipt: { type: "boolean", description: "True if this looks like a bank transfer receipt or confirmation." },
      successful: { type: ["boolean", "null"], description: "True if it says the transfer was successful/completed." },
      amount_ngn: { type: ["number", "null"], description: "Amount transferred in Naira, digits only." },
      recipient_account_number: { type: ["string", "null"], description: "Beneficiary account number, digits only." },
      recipient_name: { type: ["string", "null"] },
      recipient_bank: { type: ["string", "null"] },
      date: { type: ["string", "null"], description: "Transfer date as shown." },
      signs_of_editing: { type: "boolean", description: "True if text looks pasted, misaligned or edited." },
      notes: { type: "string", description: "One or two sentences on anything unusual." },
    },
    required: ["is_transfer_receipt", "successful", "amount_ngn", "recipient_account_number", "recipient_name", "recipient_bank", "date", "signs_of_editing", "notes"],
  },
};

type Reading = {
  is_transfer_receipt: boolean; successful: boolean | null; amount_ngn: number | null; recipient_account_number: string | null;
  recipient_name: string | null; recipient_bank: string | null; date: string | null; signs_of_editing: boolean; notes: string;
};

/** Reads the receipt with Claude and compares it with the fee. Advisory only: a Super Admin makes the decision. */
async function checkReceipt(image: Blob, fee: WhiteLabelFee): Promise<{ verdict: "match" | "mismatch" | "unclear"; notes: string; amount: number | null; account: string | null }> {
  const data = Buffer.from(await image.arrayBuffer()).toString("base64");
  const res = await aiClient().messages.create({
    model: AI_MODEL,
    max_tokens: 1000,
    system: "You read Nigerian bank transfer receipts and screenshots and report exactly what they show. Never guess a value you cannot read; use null.",
    tools: [RECEIPT_TOOL],
    tool_choice: { type: "tool", name: RECEIPT_TOOL.name },
    messages: [{ role: "user", content: [
      { type: "image", source: { type: "base64", media_type: (image.type === "image/png" ? "image/png" : image.type === "image/webp" ? "image/webp" : "image/jpeg"), data } },
      { type: "text", text: "Read this transfer receipt." },
    ] }],
  });
  const block = res.content.find((b) => b.type === "tool_use");
  if (!block || block.type !== "tool_use") return { verdict: "unclear", notes: "The AI couldn't read the receipt.", amount: null, account: null };
  const r = block.input as Reading;
  const digits = (s: string | null) => (s ?? "").replace(/\D/g, "");
  const problems: string[] = [];
  if (!r.is_transfer_receipt) problems.push("doesn't look like a transfer receipt");
  if (r.successful === false) problems.push("transfer not marked successful");
  if (r.amount_ngn === null) problems.push("amount not readable");
  else if (Math.abs(r.amount_ngn - fee.amount) > 0.5) problems.push(`amount ₦${r.amount_ngn.toLocaleString()} instead of ₦${fee.amount.toLocaleString()}`);
  const acct = digits(r.recipient_account_number);
  if (!acct) problems.push("account number not readable");
  else if (acct !== fee.account_number && !fee.account_number.endsWith(acct.replace(/^0+/, "").slice(-4))) problems.push(`sent to account ${acct}`);
  const surname = fee.account_name.split(" ")[0].toLowerCase();
  if (r.recipient_name && !r.recipient_name.toLowerCase().includes(surname)) problems.push(`recipient name "${r.recipient_name}"`);
  if (r.signs_of_editing) problems.push("possible signs of editing");

  const unreadable = r.amount_ngn === null || !acct || !r.is_transfer_receipt;
  const verdict = problems.length === 0 ? "match" : unreadable && problems.length <= 2 ? "unclear" : "mismatch";
  const summary = [
    `Amount: ${r.amount_ngn === null ? "?" : `₦${r.amount_ngn.toLocaleString()}`}`,
    `To: ${r.recipient_name ?? "?"} · ${acct || "?"} · ${r.recipient_bank ?? "?"}`,
    r.date ? `Date: ${r.date}` : "",
    problems.length ? `Problems: ${problems.join("; ")}.` : "Everything matches.",
    r.notes,
  ].filter(Boolean).join("\n");
  return { verdict, notes: summary.slice(0, 1500), amount: r.amount_ngn, account: acct || null };
}

/** An office manager submits their transfer receipt for the white-label fee. */
export async function submitWhiteLabelAction(_prev: WlState, formData: FormData): Promise<WlState> {
  const parsed = z.object({ office_id: z.string().uuid(), reference: z.string().trim().max(120).optional() })
    .safeParse({ office_id: formData.get("office_id"), reference: formData.get("reference") || undefined });
  if (!parsed.success) return { ok: false, message: "Invalid request." };
  const file = formData.get("receipt");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Attach a screenshot of your transfer." };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
    return { ok: false, message: "Use a JPG or PNG screenshot under 5 MB." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, message: "Please sign in again." };
  const { data: feeRow } = await supabase.from("app_settings").select("value").eq("key", "white_label_fee").maybeSingle();
  const fee = feeRow?.value as WhiteLabelFee | undefined;
  if (!fee) return { ok: false, message: "White-label isn't available right now." };

  const path = `${user.id}/white-label-${Date.now()}.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`;
  const { error: upErr } = await supabase.storage.from("attachments").upload(path, file, { contentType: file.type });
  if (upErr) return { ok: false, message: "The screenshot couldn't be uploaded. Please try again." };
  const { data: row, error } = await supabase.from("white_label_requests")
    .insert({ office_id: parsed.data.office_id, amount: fee.amount, receipt_path: path, reference: parsed.data.reference || null })
    .select("id").single();
  if (error) {
    return { ok: false, message: error.code === "23505" ? "You already have a payment waiting for approval." : friendlyError(error) };
  }

  // AI pre-check (advisory). Written with the server key so members can't set it themselves.
  let note = "We'll confirm the payment and unlock white-label shortly.";
  if (isAiConfigured() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const check = await checkReceipt(file, fee);
      await createAdminClient().from("white_label_requests")
        .update({ ai_verdict: check.verdict, ai_notes: check.notes, ai_amount: check.amount, ai_account: check.account }).eq("id", row.id);
      if (check.verdict === "mismatch") note = "Our check found something that doesn't match (amount or account). A Super Admin will review it, but please double-check your transfer.";
      else if (check.verdict === "match") note = "Your receipt matches the fee. A Super Admin will confirm it shortly.";
    } catch (err) {
      console.error("White-label receipt check failed", err);
    }
  }
  revalidatePath("/office/brand");
  return { ok: true, message: `Receipt sent. ${note}` };
}

/** Super Admin decision. */
export async function decideWhiteLabelAction(id: string, approve: boolean, note: string): Promise<WlState> {
  const supabase = await createClient();
  const { error } = await supabase.rpc("decide_white_label", { p_id: id, p_approve: approve, p_note: note || null });
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath("/admin/white-label");
  return { ok: true, message: approve ? "Approved. The office can now remove “Powered by”." : "Rejected. The office has been told why." };
}
