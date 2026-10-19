import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { aiClient, aiErrorMessage, isAiConfigured } from "@/lib/ai";
import { cleanPages, cleanTheme, type FunnelPage, type FunnelProduct, type FunnelTheme } from "@/lib/funnels";

const MODEL = process.env.FUNNEL_AI_MODEL || "claude-sonnet-5-5";

const SYSTEM = `You design high-converting sales funnels for independent sellers and teams, in the style of a GoHighLevel funnel: a landing page that sells one product, then a thank-you page. You write the copy and choose the layout using the block types below. Respond by calling the provided tool exactly once, with no other text.

BLOCK TYPES (use "type" plus these fields; omit fields you do not need):
- hero: headline (max 12 words, outcome-focused), subheadline (1-2 sentences), buttonText, buttonLink ("#order" to jump to the form), imageUrl (only if given)
- text: title, body (short paragraphs; use blank lines between them)
- benefits: title, items [{title, text}] (3-6 items)
- product: name, price, description, imageUrl (only if given), buttonText
- image: url (only if given), caption
- video: url (only if given), caption
- testimonials: title, items [{name, quote}] (ONLY if the seller supplied real testimonials; otherwise do not use this block)
- faq: title, items [{q, a}] (4-6 honest questions: how to order, delivery, payment, usage, safety, support)
- countdown: label, endsAt (ISO date) (ONLY if the seller gave a real deadline)
- lead_form: title, text, buttonText, successMessage, askPhone, askMessage (use when the goal is to collect leads)
- order_form: title, text, buttonText, successMessage, productName, price (use when the goal is to sell; this is where orders are placed)
- cta: headline, text, buttonText, buttonLink ("#order")
- footer: text (short disclaimer and small print)

LAYOUT: Landing page order should read like a good sales page: hero, then a problem/benefit story (text and/or benefits), the product block, optional video or image blocks if given, faq, a cta, then the order_form (or lead_form), then footer. Keep it focused: 8-12 blocks. The second page is a thank-you page: a text block thanking the buyer and explaining what happens next (we will contact you to confirm the order and arrange delivery), optionally a cta back or a short text about sharing. Every page ends with a footer when there is small print to show.

RULES (important):
- Use ONLY the facts the seller provided. Never invent reviews, testimonials, customer names, statistics, awards, certifications, "as seen on" claims, countdown deadlines, stock levels or scarcity.
- Never promise income or earnings, and never guarantee results. Do not make medical claims: no "cures", "treats", "heals" or "prevents" any disease or condition. For health, nutrition or wellness products use careful wording such as "supports", "helps maintain", "part of a healthy routine", and end the landing page footer with: "Results vary from person to person. This product is not intended to diagnose, treat, cure or prevent any disease."
- Do not mention any company, brand or network unless the seller typed it in their product details. Never name a parent company on your own.
- Write in clear, warm, confident English suitable for Nigerian and African customers. Prices exactly as given. If no price was given, leave price empty.
- Match the requested tone. Make the headline specific to the product and its audience, not generic.
- Also choose a theme that suits the product: accent (a 6-digit hex colour with good contrast on white), mode (light or dark), font (sans or serif).`;

const PAGES_TOOL: Anthropic.Tool = {
  name: "funnel",
  description: "Return the finished funnel: its pages (each a list of blocks) and a matching visual theme.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short internal name for the funnel, max 60 characters" },
      theme: {
        type: "object",
        properties: { accent: { type: "string" }, mode: { type: "string", enum: ["light", "dark"] }, font: { type: "string", enum: ["sans", "serif"] } },
        required: ["accent", "mode", "font"],
      },
      pages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Page name, e.g. Landing page or Thank you" },
            blocks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string", enum: ["hero", "text", "benefits", "product", "image", "video", "testimonials", "faq", "countdown", "lead_form", "order_form", "cta", "footer"] },
                },
                required: ["type"],
                additionalProperties: true,
              },
            },
          },
          required: ["name", "blocks"],
        },
      },
    },
    required: ["pages", "theme"],
  },
};

export type FunnelDraft = { title: string; theme: FunnelTheme; pages: FunnelPage[] };
export type DesignInput = { product: FunnelProduct; goal: "sell" | "leads"; tone: string; ownerName: string };

function describe(p: FunnelProduct) {
  return [
    `Product name: ${p.name}`,
    p.price && `Price: ${p.price}`,
    p.description && `What it is:\n${p.description}`,
    p.benefits && `Benefits and selling points:\n${p.benefits}`,
    p.audience && `Who it is for: ${p.audience}`,
    p.offer && `Offer / bonus / guarantee the seller stated: ${p.offer}`,
    p.imageUrl && `Product photo URL (use for hero or product imageUrl): ${p.imageUrl}`,
  ].filter(Boolean).join("\n\n");
}

async function run(user: string): Promise<FunnelDraft | { error: string }> {
  if (!isAiConfigured()) return { error: "Maximus AI is not configured yet. Please tell an administrator." };
  try {
    const res = await aiClient().messages.create({
      model: MODEL,
      max_tokens: 12000,
      system: SYSTEM,
      tools: [PAGES_TOOL],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: user }],
    });
    const block = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const d = block?.input as { title?: string; theme?: unknown; pages?: unknown } | undefined;
    const pages = cleanPages(d?.pages);
    if (!pages.length || !pages[0].blocks.length) return { error: "Maximus AI didn't return a full funnel. Please try again." };
    return { title: String(d?.title ?? "").trim().slice(0, 80), theme: cleanTheme(d?.theme), pages };
  } catch (err) {
    console.error("[funnel-ai]", err);
    return { error: aiErrorMessage(err) };
  }
}

/** Designs a whole funnel from the product details. */
export function designFunnel({ product, goal, tone, ownerName }: DesignInput) {
  return run(
    `<seller>${ownerName}</seller>\n<product>\n${describe(product)}\n</product>\n<goal>${goal === "sell" ? "Sell the product directly (use an order_form)." : "Collect leads (use a lead_form)."}</goal>\n<tone>${tone || "friendly and confident"}</tone>\n\nDesign the funnel: a landing page and a thank-you page.`,
  );
}

/** Changes an existing funnel as the seller asked, keeping everything else. */
export function reviseFunnel({ product, pages, theme, instruction, ownerName }: { product: FunnelProduct; pages: FunnelPage[]; theme: FunnelTheme; instruction: string; ownerName: string }) {
  return run(
    `<seller>${ownerName}</seller>\n<product>\n${describe(product)}\n</product>\n<current_funnel>\n${JSON.stringify({ theme, pages }).slice(0, 40_000)}\n</current_funnel>\n<change_request>\n${instruction}\n</change_request>\n\nReturn the complete updated funnel. Keep every block, id, link, image and text that the request does not touch exactly as it is, and keep the same block ids.`,
  );
}
