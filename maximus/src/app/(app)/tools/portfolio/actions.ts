"use server";

import type Anthropic from "@anthropic-ai/sdk";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { aiClient, aiErrorMessage, isAiConfigured } from "@/lib/ai";
import { requireViewer } from "@/lib/auth";
import { textToProjects, textToServices, type PortfolioProject, type PortfolioService } from "@/lib/portfolio";
import { rankLabel } from "@/lib/ranks";
import { createClient } from "@/lib/supabase/server";
import { friendlyError } from "@/lib/utils";

type State = { ok: boolean; message: string } | null;
const MODEL = process.env.UPWORK_ANALYSER_MODEL || "claude-sonnet-5-5";

type Draft = { headline: string; bio: string; skills: string[]; services: PortfolioService[]; projects: PortfolioProject[] };

const SITE_TOOL: Anthropic.Tool = {
  name: "portfolio_site",
  description: "Return the content for the freelancer's one-page portfolio website.",
  input_schema: {
    type: "object",
    properties: {
      headline: { type: "string", description: "Short headline under their name, max 120 characters" },
      bio: { type: "string", description: "About section, first person, 80-160 words, warm and professional" },
      skills: { type: "array", items: { type: "string" }, description: "6-15 skills" },
      services: {
        type: "array", description: "2-5 services they offer",
        items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, price: { type: ["string", "null"] } }, required: ["title", "description"] },
      },
      projects: {
        type: "array", description: "Up to 6 work samples drawn only from what the member actually did",
        items: { type: "object", properties: { title: { type: "string" }, description: { type: "string" } }, required: ["title", "description"] },
      },
    },
    required: ["headline", "bio", "skills", "services", "projects"],
  },
};

/** Writes the site from the member's own data. Never invents clients, numbers or reviews. */
async function draftWithAI(focus: string | null): Promise<Draft | { error: string }> {
  if (!isAiConfigured()) return { error: "Maximus AI is not configured yet. Please tell an administrator." };
  const viewer = await requireViewer();
  const supabase = await createClient();
  const [{ data: analysis }, { data: orders }] = await Promise.all([
    supabase.from("upwork_analyses").select("input").order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("orders").select("platform, category, description, status").eq("member_id", viewer.id).neq("status", "cancelled")
      .order("order_date", { ascending: false }).limit(15),
  ]);
  const facts = [
    `Name: ${viewer.profile.full_name}`,
    rankLabel(viewer.profile.business_rank) ? `Business status: ${rankLabel(viewer.profile.business_rank)}` : null,
    focus ? `This site should focus on: ${focus}` : null,
    analysis?.input ? `Their Upwork profile details:\n${JSON.stringify(analysis.input).slice(0, 5000)}` : null,
    orders?.length ? `Work they have recorded (most recent first):\n${orders.map((o) => `- ${[o.platform, o.category, o.description].filter(Boolean).join(" · ")}`).join("\n")}` : null,
  ].filter(Boolean).join("\n\n");
  try {
    const res = await aiClient().messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: "You write one-page portfolio websites for Nigerian freelancers and network marketers. Use only the facts given. Never invent clients, company names, numbers, results or reviews; if there is little information, keep projects generic (e.g. 'Sample: ...') or leave the list short. Clear, confident, friendly English. Always respond by calling the provided tool exactly once, with no other text.",
      tools: [SITE_TOOL],
      tool_choice: { type: "auto" },
      messages: [{ role: "user", content: `<member>\n${facts}\n</member>\n\nWrite their portfolio website.` }],
    });
    const block = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
    const d = block?.input as Partial<Draft> | undefined;
    if (!d?.headline || !d.bio) return { error: "Maximus AI didn't return a full website. Please try again." };
    return {
      headline: d.headline.slice(0, 140), bio: d.bio.slice(0, 2000), skills: (d.skills ?? []).slice(0, 30).map((s) => String(s).slice(0, 40)),
      services: (d.services ?? []).slice(0, 12).map((s) => ({ title: String(s.title).slice(0, 80), description: String(s.description ?? "").slice(0, 400), price: s.price ? String(s.price).slice(0, 40) : null })),
      projects: (d.projects ?? []).slice(0, 20).map((p) => ({ title: String(p.title).slice(0, 100), description: String(p.description ?? "").slice(0, 500), link: null })),
    };
  } catch (err) {
    console.error("[portfolio-ai]", err);
    return { error: aiErrorMessage(err) };
  }
}

export async function createPortfolioAction(_: State, form: FormData): Promise<State> {
  await requireViewer();
  const focus = z.string().trim().max(60).safeParse(form.get("focus") ?? "").data || null;
  const supabase = await createClient();
  const { data: allowed } = await supabase.rpc("can_add_portfolio");
  if (!allowed) return { ok: false, message: "Unlock more portfolio websites first (₦500 one-time)." };
  const draft = await draftWithAI(focus);
  if ("error" in draft) return { ok: false, message: draft.error };
  const { data: slug } = await supabase.rpc("suggest_portfolio_slug", { p_hint: focus });
  const { data, error } = await supabase.from("portfolios").insert({ slug: slug as string, title: focus, ...draft, published: true }).select("id").single();
  if (error) return { ok: false, message: friendlyError(error, error.message) };
  revalidatePath("/tools/portfolio");
  redirect(`/tools/portfolio/${data.id}?new=1`);
}

export async function rebuildPortfolioAction(id: string): Promise<State> {
  if (!z.string().uuid().safeParse(id).success) return { ok: false, message: "Unknown website." };
  const supabase = await createClient();
  const { data: row } = await supabase.from("portfolios").select("title").eq("id", id).maybeSingle();
  if (!row) return { ok: false, message: "Unknown website." };
  const draft = await draftWithAI(row.title);
  if ("error" in draft) return { ok: false, message: draft.error };
  const { error } = await supabase.from("portfolios").update(draft).eq("id", id);
  if (error) return { ok: false, message: friendlyError(error) };
  revalidatePath(`/tools/portfolio/${id}`);
  return { ok: true, message: "Rebuilt from your latest information." };
}

const slugRule = z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/, "Use 3–40 letters, numbers or dashes");
export async function savePortfolioAction(_: State, form: FormData): Promise<State> {
  const parsed = z.object({
    id: z.string().uuid(), slug: slugRule, title: z.string().trim().max(60).optional(),
    headline: z.string().trim().max(140), bio: z.string().trim().max(2000), skills: z.string().max(1500),
    services: z.string().max(6000), projects: z.string().max(10000), accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Check the form." };
  const v = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.from("portfolios").update({
    slug: v.slug, title: v.title || null, headline: v.headline, bio: v.bio,
    skills: v.skills.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 30),
    services: textToServices(v.services), projects: textToProjects(v.projects), accent: v.accent ?? null,
    published: form.get("published") === "on", show_whatsapp: form.get("show_whatsapp") === "on", show_email: form.get("show_email") === "on",
  }).eq("id", v.id);
  if (error) return { ok: false, message: /duplicate|unique/i.test(error.message) ? "That link name is taken. Try another." : friendlyError(error) };
  revalidatePath(`/tools/portfolio/${v.id}`);
  revalidatePath("/tools/portfolio");
  return { ok: true, message: "Saved. Your website is updated." };
}

export async function deletePortfolioAction(id: string) {
  if (!z.string().uuid().safeParse(id).success) return;
  const supabase = await createClient();
  await supabase.from("portfolios").delete().eq("id", id);
  revalidatePath("/tools/portfolio");
  redirect("/tools/portfolio");
}
