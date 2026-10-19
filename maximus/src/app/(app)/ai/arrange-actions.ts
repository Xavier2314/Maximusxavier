"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { AI_MODEL, aiClient, aiErrorMessage, isAiConfigured } from "@/lib/ai";
import { requireViewer } from "@/lib/auth";
import { todayIn } from "@/lib/utils";

const num = { type: ["number", "null"] } as const;
const int = { type: ["integer", "null"] } as const;
const str = { type: ["string", "null"] } as const;

const SCHEMAS: Record<string, { what: string; properties: Record<string, unknown> }> = {
  evaluation: {
    what: "a 5-day work evaluation for a network-marketing/freelance member",
    properties: {
      earnings: { ...num, description: "Naira earned this period" }, prospects: int, presentations: int, follow_ups: int,
      orders_generated: int, new_joins: int, members_supported: int,
      challenges: str, priorities: { ...str, description: "Priorities for the next five days, as a short list" }, support_needed: str,
    },
  },
  order: {
    what: "an order or job the member got (Fiverr, Upwork, other freelance work, or a product sale)",
    properties: {
      platform: { type: ["string", "null"], enum: ["fiverr", "upwork", "freelance_other", "product", "other", null] },
      description: str, amount: { ...num, description: "Naira" }, customer_name: str,
      order_date: { ...str, description: "YYYY-MM-DD" }, status: { type: ["string", "null"], enum: ["pending", "confirmed", "delivered", null] },
    },
  },
  payment: {
    what: "a savings deposit, contribution or withdrawal request to the organisation",
    properties: {
      kind: { type: ["string", "null"], enum: ["deposit", "contribution", "withdrawal", null] },
      amount: { ...num, description: "Naira" }, occurred_on: { ...str, description: "YYYY-MM-DD" },
      note: { ...str, description: "Short details: bank, reference, purpose" },
    },
  },
};

/** Turns what the member said or typed into the fields of a form. Only fills what they actually mentioned. */
export async function arrangeAction(kind: "evaluation" | "order" | "payment", text: string): Promise<{ ok: boolean; message: string; data?: Record<string, unknown> }> {
  const viewer = await requireViewer();
  const input = z.string().trim().min(5, "Say or type a little more first.").max(4000).safeParse(text);
  if (!input.success) return { ok: false, message: input.error.issues[0].message };
  const schema = SCHEMAS[kind];
  if (!schema) return { ok: false, message: "Unknown form." };
  if (!isAiConfigured()) return { ok: false, message: "Maximus AI is not configured yet." };
  const tool: Anthropic.Tool = {
    name: "fill_form",
    description: `Fill in ${schema.what}.`,
    input_schema: { type: "object", properties: schema.properties },
  };
  try {
    const res = await aiClient().messages.create({
      model: AI_MODEL,
      max_tokens: 4000,
      system: "You turn what a Nigerian team member said (often spoken, informal, mixed English/Pidgin) into form fields. Only fill fields they clearly mentioned; leave others null. Convert amounts like '50k' to 50000 and relative dates like 'yesterday' to YYYY-MM-DD. Keep their own words for text fields, lightly tidied. Always respond by calling the provided tool exactly once, with no other text.",
      tools: [tool],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: `Today is ${todayIn(viewer.profile.timezone)}.\n\n${input.data}` }],
    });
    const block = res.content.find((b) => b.type === "tool_use");
    if (!block || block.type !== "tool_use") return { ok: false, message: "Maximus AI couldn't arrange that. Please try again." };
    const data = Object.fromEntries(Object.entries(block.input as Record<string, unknown>).filter(([, v]) => v !== null && v !== ""));
    return { ok: true, message: "Done. Check the form below, change anything, then submit.", data };
  } catch (err) {
    console.error("Arrange failed", err);
    return { ok: false, message: aiErrorMessage(err) };
  }
}
