import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { aiClient, aiErrorMessage, isAiConfigured } from "@/lib/ai";
import { OBJECTIVES, cleanPlan, type AdPlan, type PlanInputs } from "@/lib/ad-plan";
import { checkAdText, conceptText, hasBlocking } from "@/lib/ad-rules";
import type { FunnelProduct } from "@/lib/funnels";

const MODEL = process.env.FUNNEL_AI_MODEL || "claude-sonnet-5-5";

const SYSTEM = `You are a direct-response Facebook and Instagram advertising strategist for independent sellers in Nigeria and across Africa. You plan ads that send people to the seller's own funnel page (or to a WhatsApp chat) and turn them into paying customers. Respond by calling the provided tool exactly once.

WHAT MAKES ADS SELL
- Creative variety matters more than audience tricks. Produce 4 genuinely DIFFERENT concepts, not rewrites of one idea. Use different angles, for example: (1) a short problem-to-solution demo of the product, (2) answering the biggest buying objection (price, delivery, trust, how to use it), (3) an offer-led ad built on the seller's real offer, (4) the seller or a real customer talking to camera. Mark at least two as "video" and at least one as "image".
- The first line of every primary text is the hook: specific and about the product or the outcome of using it, never a vague question. Keep primary text short (about 3 to 6 short lines). Plain, warm English a Nigerian customer uses. No hype, no all caps, at most one exclamation mark.
- Headlines are under 40 characters and say what the product is or the offer. Descriptions are under 30 characters.
- Always include practical trust signals the seller actually gave: delivery areas, pay on delivery, price in naira, how to order. Never invent them.
- Videos are 15 to 25 seconds, vertical 9:16, with the hook working in the first 3 seconds with the sound off. Give a shot list the seller can film on a phone (hook, problem or context, the product in use, the offer, call to action), a voiceover script, and short on-screen text. Use the seller's real product; do not describe fake customers, doctors or testimonials.
- Image concepts describe one clear product-led picture: the real product, a clear benefit line of 6 words or fewer as overlay text, and the price or offer when given. No before and after pictures.
- Call to action matches the objective: WhatsApp messages -> WHATSAPP_MESSAGE; orders -> SHOP_NOW or ORDER_NOW; leads -> SIGN_UP; visits -> LEARN_MORE.

AUDIENCE AND BUDGET
- Prefer broad targeting inside the seller's real delivery areas (a city or a few cities, not all of Nigeria unless they deliver nationwide). Give 3 to 8 interest suggestions that match the product's buyers, but say in notes that broad is fine. Ages 18 and over; for health or wellness products use 25 to 55 unless told otherwise. Never target by a health condition.
- Budget: use the daily naira budget the seller gave. Explain in one or two sentences what it can realistically buy: Meta needs about 50 conversions a week to optimise, so a small budget means optimising for messages or leads, not purchases. Suggest testing for 5 to 7 days before changing anything.
- Testing plan: 4 to 6 short, concrete steps (when to judge, when to pause an ad, when to raise the budget by at most 20 percent, and to track orders using the tagged links).

STRICT RULES. These are Meta's advertising rules and the law; breaking them gets the seller's account restricted.
- Use ONLY facts the seller provided. Never invent reviews, testimonials, customer counts, ratings, awards, certifications, statistics, discounts, deadlines, stock levels, results or guarantees.
- Never promise or imply results. No weight-loss or body numbers, no "in 7 days", no guarantees, no "proven", no "100%". For health, nutrition and wellness products say what the product is and what it supports, in careful words such as "supports", "part of a healthy routine".
- Never claim to cure, treat, heal or prevent any disease or condition, and never name a disease or condition (diabetes, cancer, blood pressure, ulcer and similar).
- Never address the viewer's health, body, weight, age or other personal condition ("Are you struggling with...", "your belly fat", "do you have..."). Talk about the product, not the person.
- Never mention income, earnings, getting rich, quitting a job, being your own boss, recruiting, joining a team or a business opportunity. These ads sell a product to customers only.
- No before-and-after or transformation language. No scarcity or urgency unless the seller gave a real deadline or stock number.
- Do not use the words Facebook, Instagram or Meta in ad copy. Do not name any company or brand unless the seller typed it in their product details.`;

const TOOL: Anthropic.Tool = {
  name: "ad_plan",
  description: "Return the complete ad plan.",
  input_schema: {
    type: "object",
    properties: {
      audience: {
        type: "object",
        properties: {
          locations: { type: "array", items: { type: "string" } }, ageMin: { type: "number" }, ageMax: { type: "number" },
          gender: { type: "string", enum: ["all", "women", "men"] }, interests: { type: "array", items: { type: "string" } }, notes: { type: "string" },
        },
        required: ["locations", "ageMin", "ageMax", "gender", "interests", "notes"],
      },
      budget: { type: "object", properties: { dailyNgn: { type: "number" }, testDays: { type: "number" }, rationale: { type: "string" } }, required: ["dailyNgn", "testDays", "rationale"] },
      concepts: {
        type: "array", minItems: 3, maxItems: 5,
        items: {
          type: "object",
          properties: {
            id: { type: "string" }, name: { type: "string" }, angle: { type: "string" }, format: { type: "string", enum: ["video", "image"] },
            primaryText: { type: "string" }, headline: { type: "string" }, description: { type: "string" },
            cta: { type: "string", enum: ["WHATSAPP_MESSAGE", "SHOP_NOW", "ORDER_NOW", "LEARN_MORE", "SIGN_UP", "CONTACT_US"] },
            creativeBrief: { type: "string" },
            video: { type: "object", properties: { lengthSec: { type: "number" }, hook: { type: "string" }, scenes: { type: "array", items: { type: "string" } }, voiceover: { type: "string" }, onScreenText: { type: "string" } } },
          },
          required: ["id", "name", "angle", "format", "primaryText", "headline", "description", "cta", "creativeBrief"],
        },
      },
      testing: { type: "array", items: { type: "string" } },
    },
    required: ["audience", "budget", "concepts", "testing"],
  },
};

function describe(p: FunnelProduct, inputs: PlanInputs, funnelTitle: string, pages: number) {
  const obj = OBJECTIVES.find((o) => o.key === inputs.objective)!;
  return [
    `Funnel: ${funnelTitle} (${pages} page${pages === 1 ? "" : "s"})`,
    `Product name: ${p.name}`, p.price && `Price: ${p.price}`,
    p.description && `What it is:\n${p.description}`, p.benefits && `Benefits and selling points:\n${p.benefits}`,
    p.audience && `Who it is for: ${p.audience}`, (inputs.offer || p.offer) && `Offer / bonus / guarantee the seller stated: ${inputs.offer || p.offer}`,
    p.whatsapp && "The seller takes orders on WhatsApp.",
    `Objective: ${obj.label}. ${obj.hint}`,
    `Daily budget: ₦${inputs.dailyBudgetNgn.toLocaleString("en-NG")}`,
    `Where the seller delivers / sells: ${inputs.areas || "not stated: ask the seller to set this; default to Lagos and Abuja"}`,
    inputs.healthProduct ? "This is a food, supplement, herbal or health product: apply the health rules with extra care and target adults only." : "This is not a health product.",
  ].filter(Boolean).join("\n\n");
}

/** Drafts an ad plan, then checks every concept against the ad rules. Concepts that break a rule get one automatic rewrite pass. */
export async function draftAdPlan(args: { product: FunnelProduct; inputs: PlanInputs; funnelTitle: string; pageCount: number }): Promise<AdPlan | { error: string }> {
  if (!isAiConfigured()) return { error: "Maximus AI is not configured yet. Please tell an administrator." };
  const base = `<product>\n${describe(args.product, args.inputs, args.funnelTitle, args.pageCount)}\n</product>\n\nPlan the ads.`;
  try {
    let plan = await call(base, args.inputs);
    if (!plan) return { error: "The AI didn't return a full plan. Please try again." };
    const bad = plan.concepts.filter((c) => hasBlocking(checkAdText(conceptText({ primaryText: c.primaryText, headline: c.headline, description: c.description, videoText: c.video ? `${c.video.hook} ${c.video.voiceover} ${c.video.onScreenText} ${c.video.scenes.join(" ")}` : "" }))));
    if (bad.length) {
      const notes = bad.map((c) => `Concept "${c.name}": ${checkAdText(conceptText(c)).filter((i) => i.severity === "block").map((i) => `${i.message} (found: "${i.match}")`).join("; ")}`).join("\n");
      const fixed = await call(`${base}\n\nA previous draft broke the advertising rules in these concepts. Rewrite the whole plan so that none of these problems remain, keeping the good ideas:\n${notes}`, args.inputs);
      if (fixed) plan = fixed;
    }
    return plan;
  } catch (err) {
    console.error("[ad-ai]", err);
    return { error: aiErrorMessage(err) };
  }
}

async function call(user: string, inputs: PlanInputs): Promise<AdPlan | null> {
  const res = await aiClient().messages.create({ model: MODEL, max_tokens: 8000, system: SYSTEM, tools: [TOOL], tool_choice: { type: "tool", name: "ad_plan" }, messages: [{ role: "user", content: user }] });
  const block = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  return block ? cleanPlan({ ...(block.input as object), inputs }, inputs) : null;
}
