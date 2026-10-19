import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { aiClient, aiErrorMessage, isAiConfigured } from "@/lib/ai";
import { STYLES } from "@/lib/funnel-styles";
import { cleanPages, cleanTheme, FUNNEL_TYPES, STYLE_KEYS, type FunnelPage, type FunnelProduct, type FunnelTheme, type StyleKey } from "@/lib/funnels";

const MODEL = process.env.FUNNEL_AI_MODEL || "claude-sonnet-5-5";

const STYLE_GUIDE = STYLE_KEYS.map((k) => `- ${k}: ${STYLES[k].name}. ${STYLES[k].blurb} Good for: ${STYLES[k].goodFor}.`).join("\n");

const SYSTEM = `You are a world-class funnel designer and direct-response copywriter, working like the best GoHighLevel and ClickFunnels experts, for independent sellers and small teams in Nigeria and across Africa. You design complete, beautiful, high-converting funnels. A funnel is a series of pages (steps); each page is a stack of blocks. Respond by calling the provided tool exactly once, with no other text.

BLOCK TYPES. Every block has "type". Optional on ANY block: "bg" (none | tint | accent | dark | gradient: the section background), "space" (compact | normal | roomy), "align" (left | center), "variant" (layout, listed per block). Fields:
- announcement: text, link. A slim strip at the very top (use for a real offer or deadline the seller gave).
- hero: badge (tiny label above the headline), headline, subheadline, buttonText, buttonLink, imageUrl. variant: center | split (text + image; use when a product image URL is given) | cover (image behind text).
- text: title, body. Short paragraphs separated by blank lines.
- benefits: title, subtitle, items [{icon (one emoji), title, text}] (3-6). variant: cards | list | icons.
- steps: title, items [{title, text}] (3). variant: row | column.
- product: name, price, oldPrice (only if the seller gave one), description, points (benefit lines separated by newlines), imageUrl, buttonText. variant: split | reverse | stacked.
- offer: title, items [{title, text, value}], totalValue, price, buttonText, note. The "everything you get" stack. Only use values the seller provided.
- image: url, caption. video: url, caption. gallery: title, items [{url, caption}]. Use these ONLY with URLs the seller gave.
- testimonials: title, items [{name, role, quote, imageUrl}]. variant: grid | single. ONLY if the seller supplied real testimonials.
- stats: items [{value, label}] (2-4). ONLY real numbers the seller gave.
- faq: title, items [{q, a}] (4-6). Answer real objections: how to order, payment, delivery, safety, how it is used, who it is for.
- guarantee: title, text. ONLY if the seller stated a guarantee.
- about: title (small label), name, text, imageUrl. variant: left | right. Use the seller's name only if given.
- countdown: label, endsAt (ISO). ONLY if the seller gave a real deadline. event: title, startsAt (ISO), where, note (webinars, launches).
- lead_form: title, text, buttonText, successMessage, askPhone, askMessage, imageUrl. variant: card | split. Collects sign-ups.
- order_form: title, text, buttonText, successMessage, productName, price, bumpText, bumpPrice. Takes orders. bumpText/bumpPrice describe an optional add-on checkbox; only use if the seller mentioned an add-on.
- cta: headline, text, buttonText, buttonLink. A strong closing section (give it bg gradient or dark). button: text, link. spacer. footer: text.

LINKS: use "#order" to jump to the form on the same page, and "#next" to send the visitor to the next page of the funnel. Never invent other URLs.

FUNNEL TYPES (build the pages for the requested type):
- sales: Page 1 "Sales page": announcement (only if an offer exists), hero (#next), a problem-and-promise text, benefits, steps (how to order), product, offer (if there is an offer), testimonials/gallery/video only if given, faq, guarantee only if given, cta (#next), footer. Page 2 "Order": a short text, product (variant stacked), order_form, footer. Page 3 "Thank you": text (align center), steps (what happens next), footer.
- quick: Page 1 "Offer page": announcement (if an offer exists), hero (#order), benefits, product, steps, faq, order_form, footer. Page 2 "Thank you".
- leadmagnet: Page 1 "Sign-up page": hero (#order), benefits (what you get), lead_form (variant split if an image is given), footer. Page 2 "Thank you": text and a clear next step.
- webinar: Page 1 "Registration": announcement, hero (badge such as "Free live session"), event, benefits ("What you will learn"), about, lead_form, footer. Page 2 "Confirmed": text, event, steps.
- call: Page 1 "Apply page": hero (#order), benefits ("Is this for you?"), steps (what happens next), about, faq, lead_form (askPhone and askMessage true), footer. Page 2 "Thank you".

DESIGN CRAFT:
- Give the page visual rhythm: alternate sections between no background and "tint"; make at most one or two sections "dark" or "gradient" for emphasis (the final cta is usually gradient). Vary benefits variants and use "roomy" spacing on the hero and cta.
- Headlines: specific, outcome-focused, about the customer, 6-12 words. No clichés, no all caps, no exclamation marks in headlines. Sub-headlines explain who it is for and what they get. Benefits describe results for the customer, not features. Button text is action-led and specific ("Get my pack", "Save my seat", "Send me the guide"), never "Submit".
- Write like a warm, confident person. Short sentences. Plain English suited to Nigerian and African customers. Use the prices exactly as the seller wrote them. Use an emoji icon in each benefit.
- Use the product image URL (if given) in the hero (variant split) and the product block.
- STYLE: the seller either picks a style or asks you to choose. Styles:
${STYLE_GUIDE}
  Return theme.style as one of: ${STYLE_KEYS.join(", ")}. If the seller picked one, use it exactly. Choose theme.accent (a 6-digit hex with good contrast on white, or on dark for dark styles) that suits the product; for a picked style you may keep its default accent when no colour suits better. theme.mode is "light" except for the midnight style ("dark").

RULES (important):
- Use ONLY the facts the seller provided. Never invent reviews, testimonials, customer names, statistics, numbers, awards, certifications, "as seen on" claims, countdown deadlines, stock levels, scarcity, discounts, bonuses or guarantees.
- Never promise income or earnings, and never guarantee results. Do not make medical claims: no "cures", "treats", "heals" or "prevents" any disease or condition. For health, nutrition or wellness products use careful wording such as "supports", "helps maintain", "part of a healthy routine", and end the landing page footer with: "Results vary from person to person. This product is not intended to diagnose, treat, cure or prevent any disease."
- Do not mention any company, brand or network unless the seller typed it in their product details. Never name a parent company on your own.
- If there is no price, leave price fields empty. If a block would need information you do not have, leave it out.`;

const BLOCK_ENUM = ["announcement", "hero", "text", "benefits", "steps", "product", "offer", "image", "video", "gallery", "testimonials", "stats", "faq", "guarantee", "about", "countdown", "event", "lead_form", "order_form", "cta", "button", "spacer", "footer"];

const FUNNEL_TOOL: Anthropic.Tool = {
  name: "funnel",
  description: "Return the finished funnel: its pages (each a list of blocks) and its visual theme.",
  input_schema: {
    type: "object",
    properties: {
      title: { type: "string", description: "Short internal name for the funnel, max 60 characters" },
      theme: {
        type: "object",
        properties: { style: { type: "string", enum: STYLE_KEYS }, accent: { type: "string" }, mode: { type: "string", enum: ["light", "dark"] } },
        required: ["style", "accent", "mode"],
      },
      pages: {
        type: "array",
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "Page name, e.g. Sales page or Thank you" },
            blocks: { type: "array", items: { type: "object", properties: { type: { type: "string", enum: BLOCK_ENUM } }, required: ["type"], additionalProperties: true } },
          },
          required: ["name", "blocks"],
        },
      },
    },
    required: ["pages", "theme"],
  },
};

export type FunnelDraft = { title: string; theme: FunnelTheme; pages: FunnelPage[] };
export type DesignInput = { product: FunnelProduct; tone: string; style: StyleKey | "auto"; ownerName: string };

function describe(p: FunnelProduct) {
  return [
    `Product name: ${p.name}`,
    p.price && `Price: ${p.price}`,
    p.description && `What it is:\n${p.description}`,
    p.benefits && `Benefits and selling points:\n${p.benefits}`,
    p.audience && `Who it is for: ${p.audience}`,
    p.offer && `Offer / bonus / guarantee the seller stated: ${p.offer}`,
    p.imageUrl && `Product photo URL (use it in the hero and product blocks): ${p.imageUrl}`,
  ].filter(Boolean).join("\n\n");
}

async function run(user: string): Promise<FunnelDraft | { error: string }> {
  if (!isAiConfigured()) return { error: "Maximus AI is not configured yet. Please tell an administrator." };
  try {
    const res = await aiClient().messages.create({
      model: MODEL,
      max_tokens: 16000,
      system: SYSTEM,
      tools: [FUNNEL_TOOL],
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
export function designFunnel({ product, tone, style, ownerName }: DesignInput) {
  const type = FUNNEL_TYPES.find((t) => t.key === product.funnelType) ?? FUNNEL_TYPES[0];
  return run(
    `<seller>${ownerName}</seller>\n<product>\n${describe(product)}\n</product>\n<funnel_type>${type.key}: ${type.name} (${type.steps.join(" → ")})</funnel_type>\n<style>${style === "auto" ? "Choose the best style for this product." : `Use the "${style}" style exactly.`}</style>\n<tone>${tone || "friendly and confident"}</tone>\n\nDesign the complete funnel.`,
  );
}

/** Changes an existing funnel as the seller asked, keeping everything else. */
export function reviseFunnel({ product, pages, theme, instruction, ownerName, focusBlockId }: {
  product: FunnelProduct; pages: FunnelPage[]; theme: FunnelTheme; instruction: string; ownerName: string; focusBlockId?: string;
}) {
  return run(
    `<seller>${ownerName}</seller>\n<product>\n${describe(product)}\n</product>\n<current_funnel>\n${JSON.stringify({ theme, pages }).slice(0, 60_000)}\n</current_funnel>\n${focusBlockId ? `<selected_block>${focusBlockId}</selected_block>\nThe seller has selected this block. Apply the request to that block only (and a directly related block if the request clearly needs it).\n` : ""}<change_request>\n${instruction}\n</change_request>\n\nReturn the complete updated funnel. Keep every block, id, link, image, style and text that the request does not touch exactly as it is, and keep the same block ids.`,
  );
}
