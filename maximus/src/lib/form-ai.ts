import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { aiClient, aiErrorMessage, isAiConfigured } from "@/lib/ai";
import { cleanForm, FIELD_KEYS, type FormDef, type FormKind } from "@/lib/forms";

const MODEL = process.env.FUNNEL_AI_MODEL || "claude-sonnet-5-5";

const SYSTEM = `You design short, effective forms and surveys for independent sellers and small teams in Nigeria and across Africa. Respond by calling the provided tool exactly once.

DESIGN RULES
- Ask only what the seller really needs. Fewer questions get more answers: a lead or order form usually needs 3 to 6 questions; a survey 5 to 10. Never more than 12.
- Put the easiest questions first and the most personal (phone, email) last. Group into steps only when there are more than 6 questions (2 or 3 steps with short titles); otherwise use one step with an empty title.
- Use the right field type: "short" for names and one-line answers, "long" only when you truly need a sentence, "email", "phone", "select" for more than 4 options, "radio" for 2 to 4 options, "checkbox" for pick-several, "yesno", "rating" (1 to 5 stars) for satisfaction, "nps" (0 to 10) for how likely to recommend, "date", "number".
- Question wording is plain, warm and specific. No jargon. Mark a question required only if the seller cannot act without it.
- For surveys: start with a rating or yes/no, mix closed questions with at most one or two open ones, and end with an optional "Anything else you would like to tell us?" (long). If it is a customer-satisfaction survey, include one "nps" question.
- If the form collects a name, email or phone number, set "consent" to a short sentence the visitor must tick, for example "I agree to be contacted about my enquiry." Otherwise leave it empty.
- intro.title is a clear heading; intro.text is one short, friendly sentence saying how long it takes or why. successTitle and successText thank the person and say what happens next, without making promises the seller did not state.
- Never invent facts about the seller, prices, deadlines or guarantees. Do not ask for sensitive data (passwords, bank card numbers, government ID numbers, medical conditions).
- Options for select/radio/checkbox are short, mutually exclusive where it makes sense, and never fewer than 2.`;

const TOOL: Anthropic.Tool = {
  name: "form",
  description: "Return the complete form or survey.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string" },
      intro: { type: "object", properties: { title: { type: "string" }, text: { type: "string" } }, required: ["title", "text"] },
      steps: {
        type: "array", minItems: 1, maxItems: 4,
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            fields: {
              type: "array", minItems: 1, maxItems: 12,
              items: { type: "object", properties: { type: { type: "string", enum: FIELD_KEYS }, label: { type: "string" }, help: { type: "string" }, required: { type: "boolean" }, options: { type: "array", items: { type: "string" } } }, required: ["type", "label", "required"] },
            },
          },
          required: ["fields"],
        },
      },
      submitText: { type: "string" }, successTitle: { type: "string" }, successText: { type: "string" }, consent: { type: "string" },
    },
    required: ["title", "intro", "steps", "submitText", "successTitle", "successText"],
  },
};

export async function draftForm(args: { kind: FormKind; description: string; ownerName: string }): Promise<{ title: string; def: FormDef } | { error: string }> {
  if (!isAiConfigured()) return { error: "Maximus AI is not configured yet. Please tell an administrator." };
  try {
    const res = await aiClient().messages.create({
      model: MODEL, max_tokens: 4000, system: SYSTEM, tools: [TOOL], tool_choice: { type: "tool", name: "form" },
      messages: [{ role: "user", content: `<seller>${args.ownerName}</seller>\n<kind>${args.kind === "survey" ? "survey" : "form (leads, orders, bookings or applications)"}</kind>\n<what_the_seller_wants>\n${args.description}\n</what_the_seller_wants>\n\nDesign it.` }],
    });
    const block = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const input = block?.input as { title?: string } | undefined;
    const def = cleanForm(input);
    if (!input || !def.steps.length) return { error: "The AI didn't return a usable form. Please try again." };
    return { title: String(input.title ?? "").trim().slice(0, 100) || def.intro.title.slice(0, 100) || "New form", def };
  } catch (err) {
    console.error("[form-ai]", err);
    return { error: aiErrorMessage(err) };
  }
}
