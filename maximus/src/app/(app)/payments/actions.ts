"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { requireViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { createCheckout, isFlutterwaveConfigured } from "@/lib/flutterwave";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

const schema = z.object({
  purpose: z.enum(["white_label", "savings", "contributions", "upwork_analyser", "portfolio_extra"]),
  amount: z.coerce.number().positive().max(5000000).optional(),
  office_id: z.string().uuid().optional(),
});

const TITLES = { white_label: "White-label unlock", savings: "Savings deposit", contributions: "Contribution", upwork_analyser: "Upwork Account Analyser", portfolio_extra: "More portfolio websites" } as const;

/** Start an online payment and send the member to Flutterwave's secure payment page. */
export async function startOnlinePaymentAction(_prev: { ok: boolean; message: string } | null, formData: FormData) {
  if (!isFlutterwaveConfigured()) return { ok: false, message: "Online payments aren't switched on yet. Please pay by bank transfer." };
  const parsed = schema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => v !== "")));
  if (!parsed.success) return { ok: false, message: "Enter a valid amount." };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("create_online_payment", {
    p_purpose: parsed.data.purpose, p_amount: parsed.data.amount ?? null, p_office: parsed.data.office_id ?? null,
  });
  const row = (data as { tx_ref: string; amount: number }[] | null)?.[0];
  if (error || !row) return { ok: false, message: friendlyError(error, error?.message) };
  let link: string;
  try {
    link = await createCheckout({
      txRef: row.tx_ref, amount: Number(row.amount), email: viewer.email, name: viewer.profile.full_name, phone: viewer.profile.phone,
      title: `Maximus · ${TITLES[parsed.data.purpose]}`, description: TITLES[parsed.data.purpose],
      redirectUrl: `${env.siteUrl}/api/payments/flutterwave/return`,
    });
  } catch (e) {
    console.error("[flutterwave-start]", e);
    return { ok: false, message: "We couldn't reach Flutterwave. Please try again in a minute." };
  }
  redirect(link);
}
