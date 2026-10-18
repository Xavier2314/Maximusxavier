import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { AI_MODEL, aiClient, isAiConfigured } from "@/lib/ai";
import { OPT_OUT, type Prospect, type ProspectMessage, type ProspectStage } from "@/lib/prospects";
import type { createAdminClient } from "@/lib/supabase/server";

type Admin = ReturnType<typeof createAdminClient>;

// -----------------------------------------------------------------------------
// The AI ("Prospecteer"): plans the next message from the conversation so far
// -----------------------------------------------------------------------------

const PROSPECT_SYSTEM = `You write follow-up messages for members of Maximus, a team development organisation in network marketing. A member gives you a prospect (someone they met) and the conversation so far. You write the next message the member sends, in the member's voice, usually on WhatsApp.

Rules:
- Short, warm, natural and personal: 1–4 sentences, like a real WhatsApp message from a friend. Nigerian English is fine. No hashtags, at most one emoji.
- Move the conversation one small step forward (reconnect, ask a question, invite to a short call or meeting, share something useful). Respond directly to what the prospect last said.
- Be honest. Never invent products, prices, income figures or promises. Never pressure, guilt or use fake urgency.
- If the prospect says no, asks to stop, or is clearly not interested: set stop=true, stage "not_now", and write one short polite closing message (or none).
- If the prospect asks whether this is automated or a bot, say honestly that the member uses an assistant to help them follow up and will reply personally too.
- Pick the stage that best fits the conversation now.
- follow_up_in_days: when to follow up if they don't reply (usually 2–5). Use null if nothing should be sent unprompted.`;

const PLAN_TOOL: Anthropic.Tool = {
  name: "follow_up_plan",
  description: "The next message(s) to send to the prospect and what happens next.",
  input_schema: {
    type: "object",
    properties: {
      messages: { type: "array", items: { type: "string" }, description: "Message text(s). One for 'next'/'reply', three different options for 'options'." },
      stage: { type: "string", enum: ["new", "contacted", "interested", "presentation", "follow_up", "joined", "customer", "not_now"] },
      follow_up_in_days: { type: ["integer", "null"], minimum: 1, maximum: 30 },
      stop: { type: "boolean", description: "True when the prospect declined or asked not to be contacted." },
    },
    required: ["messages", "stage", "follow_up_in_days", "stop"],
  },
};

export type FollowUpPlan = { messages: string[]; stage: ProspectStage; follow_up_in_days: number | null; stop: boolean };

export async function planFollowUp(opts: {
  prospect: Prospect; history: Pick<ProspectMessage, "direction" | "body" | "created_at" | "status">[];
  memberName: string; mode: "next" | "reply" | "options"; situation?: string; attachment?: string | null;
}): Promise<FollowUpPlan> {
  if (!isAiConfigured()) throw new Error("Maximus AI is not configured yet. An administrator needs to add ANTHROPIC_API_KEY.");
  const { prospect: p, history, memberName, mode } = opts;
  const convo = history.filter((m) => m.status !== "draft" && m.status !== "failed").slice(-30)
    .map((m) => `[${m.created_at.slice(0, 16).replace("T", " ")}] ${m.direction === "out" ? memberName : p.full_name}: ${m.body}`)
    .join("\n") || "(no messages yet — this is the first contact)";
  const task = mode === "options"
    ? `Write THREE different options for the member's next message.${opts.situation ? ` The member describes the situation: "${opts.situation}"` : ""}`
    : mode === "reply" ? "The prospect just replied. Write the member's reply." : "Write the next follow-up message to send now.";
  const res = await aiClient().messages.create({
    model: AI_MODEL,
    max_tokens: 1500,
    system: [{ type: "text", text: PROSPECT_SYSTEM, cache_control: { type: "ephemeral" } }],
    tools: [PLAN_TOOL],
    tool_choice: { type: "tool", name: PLAN_TOOL.name },
    messages: [{
      role: "user",
      content: `<member>${memberName}</member>
<prospect>
Name: ${p.full_name}
Current stage: ${p.stage}
How they met / notes: ${p.notes ?? "none"}
Source: ${p.source ?? "unknown"}
</prospect>
<conversation>
${convo}
</conversation>
${opts.attachment ? `<attachment>The member wants to share this link in the message: ${opts.attachment}</attachment>\n` : ""}Today is ${new Date().toISOString().slice(0, 10)}. ${task}`,
    }],
  });
  const block = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
  if (!block) throw new Error("Maximus AI could not write a message. Please try again.");
  const input = block.input as Partial<FollowUpPlan>;
  return {
    messages: (input.messages ?? []).map((m) => String(m).trim()).filter(Boolean).slice(0, 3),
    stage: (input.stage ?? p.stage) as ProspectStage,
    follow_up_in_days: typeof input.follow_up_in_days === "number" ? Math.min(30, Math.max(1, input.follow_up_in_days)) : null,
    stop: Boolean(input.stop),
  };
}

// -----------------------------------------------------------------------------
// WhatsApp (Meta WhatsApp Cloud API, one business number for the organisation)
// -----------------------------------------------------------------------------

export const isWhatsAppConfigured = () => Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
const GRAPH = "https://graph.facebook.com/v21.0";

type SendResult = { ok: true; externalId: string | null; usedTemplate?: boolean } | { ok: false; error: string };

export async function sendWhatsApp(to: string, body: string, opts: { windowOpen: boolean; prospectFirst: string; memberFirst: string }): Promise<SendResult> {
  if (!isWhatsAppConfigured()) return { ok: false, error: "WhatsApp is not connected yet." };
  // Outside WhatsApp's 24-hour window only an approved template may be sent;
  // the AI conversation continues as soon as the prospect replies.
  const template = process.env.WHATSAPP_TEMPLATE_NAME;
  const payload = opts.windowOpen
    ? { messaging_product: "whatsapp", to, type: "text", text: { body, preview_url: true } }
    : template
      ? {
          messaging_product: "whatsapp", to, type: "template",
          template: {
            name: template, language: { code: process.env.WHATSAPP_TEMPLATE_LANG || "en" },
            components: [{ type: "body", parameters: [{ type: "text", text: opts.prospectFirst }, { type: "text", text: opts.memberFirst }] }],
          },
        }
      : null;
  if (!payload) return { ok: false, error: "This prospect hasn't messaged in the last 24 hours, and no WhatsApp template is set up yet." };
  const res = await fetch(`${GRAPH}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json = (await res.json().catch(() => ({}))) as { messages?: { id: string }[]; error?: { message?: string } };
  if (!res.ok) return { ok: false, error: json.error?.message ?? `WhatsApp error ${res.status}` };
  return { ok: true, externalId: json.messages?.[0]?.id ?? null, usedTemplate: !opts.windowOpen };
}

// -----------------------------------------------------------------------------
// Gmail (each member connects their own Google account)
// -----------------------------------------------------------------------------

export const isGoogleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
export const GOOGLE_SCOPES = [
  "openid", "email",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
];

async function googleAccessToken(admin: Admin, userId: string): Promise<string | null> {
  const { data } = await admin.from("member_integrations").select("access_token, refresh_token, expires_at")
    .eq("user_id", userId).eq("provider", "google").maybeSingle();
  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() > Date.now() + 60_000) return data.access_token as string;
  if (!data.refresh_token || !isGoogleConfigured()) return null;
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!, client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token as string, grant_type: "refresh_token",
    }),
  });
  if (!res.ok) return null;
  const tok = (await res.json()) as { access_token: string; expires_in: number };
  await admin.from("member_integrations").update({
    access_token: tok.access_token, expires_at: new Date(Date.now() + tok.expires_in * 1000).toISOString(),
  }).eq("user_id", userId).eq("provider", "google");
  return tok.access_token;
}

const b64url = (s: string) => Buffer.from(s, "utf8").toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const mimeWord = (s: string) => `=?UTF-8?B?${Buffer.from(s, "utf8").toString("base64")}?=`;

export async function sendGmail(admin: Admin, userId: string, to: string, subject: string, body: string, threadId: string | null): Promise<SendResult & { threadId?: string }> {
  const token = await googleAccessToken(admin, userId);
  if (!token) return { ok: false, error: "Connect your Gmail in Settings first." };
  const raw = [`To: ${to}`, `Subject: ${mimeWord(subject)}`, "MIME-Version: 1.0", 'Content-Type: text/plain; charset="UTF-8"', "", body].join("\r\n");
  const res = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ raw: b64url(raw), ...(threadId ? { threadId } : {}) }),
  });
  const json = (await res.json().catch(() => ({}))) as { id?: string; threadId?: string; error?: { message?: string } };
  if (!res.ok) return { ok: false, error: json.error?.message ?? `Gmail error ${res.status}` };
  return { ok: true, externalId: json.id ?? null, threadId: json.threadId };
}

type GmailPart = { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };
function plainText(part: GmailPart): string | null {
  if (part.mimeType === "text/plain" && part.body?.data) return Buffer.from(part.body.data, "base64url").toString("utf8");
  for (const p of part.parts ?? []) { const t = plainText(p); if (t) return t; }
  return null;
}
/** Keep only the new text of an email reply (drop the quoted history). */
const stripQuoted = (t: string) => t.split(/\r?\n(?:On .{5,200} wrote:|>)/)[0].trim().slice(0, 4000);

async function gmailReplies(admin: Admin, userId: string, threadId: string, fromEmail: string) {
  const token = await googleAccessToken(admin, userId);
  if (!token) return [];
  const res = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) return [];
  const json = (await res.json()) as { messages?: { id: string; payload: GmailPart & { headers?: { name: string; value: string }[] }; snippet?: string }[] };
  return (json.messages ?? [])
    .filter((m) => (m.payload.headers ?? []).some((h) => h.name.toLowerCase() === "from" && h.value.toLowerCase().includes(fromEmail.toLowerCase())))
    .map((m) => ({ id: m.id, text: stripQuoted(plainText(m.payload) ?? m.snippet ?? "") }))
    .filter((m) => m.text);
}

// -----------------------------------------------------------------------------
// Spotify: oEmbed previews need no keys; search uses the app's client credentials
// -----------------------------------------------------------------------------

export const isSpotifySearchConfigured = () => Boolean(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
let spotifyToken: { token: string; until: number } | null = null;

export type SpotifyItem = { title: string; subtitle: string; url: string; image: string | null; kind: string };

export async function searchSpotify(q: string): Promise<SpotifyItem[]> {
  if (!isSpotifySearchConfigured()) return [];
  if (!spotifyToken || spotifyToken.until < Date.now()) {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });
    if (!res.ok) return [];
    const t = (await res.json()) as { access_token: string; expires_in: number };
    spotifyToken = { token: t.access_token, until: Date.now() + (t.expires_in - 60) * 1000 };
  }
  const res = await fetch(`https://api.spotify.com/v1/search?${new URLSearchParams({ q, type: "episode,show,track", limit: "4", market: "NG" })}`,
    { headers: { Authorization: `Bearer ${spotifyToken.token}` } });
  if (!res.ok) return [];
  type Img = { url: string }[];
  const j = (await res.json()) as {
    episodes?: { items: ({ name: string; description?: string; external_urls: { spotify: string }; images?: Img } | null)[] };
    shows?: { items: ({ name: string; publisher?: string; external_urls: { spotify: string }; images?: Img } | null)[] };
    tracks?: { items: ({ name: string; artists: { name: string }[]; external_urls: { spotify: string }; album?: { images?: Img } } | null)[] };
  };
  const out: SpotifyItem[] = [];
  for (const e of j.episodes?.items ?? []) if (e) out.push({ title: e.name, subtitle: "Podcast episode", url: e.external_urls.spotify, image: e.images?.[0]?.url ?? null, kind: "episode" });
  for (const s of j.shows?.items ?? []) if (s) out.push({ title: s.name, subtitle: s.publisher ? `Podcast · ${s.publisher}` : "Podcast", url: s.external_urls.spotify, image: s.images?.[0]?.url ?? null, kind: "show" });
  for (const t of j.tracks?.items ?? []) if (t) out.push({ title: t.name, subtitle: t.artists.map((a) => a.name).join(", "), url: t.external_urls.spotify, image: t.album?.images?.[0]?.url ?? null, kind: "track" });
  return out;
}

export async function spotifyPreview(url: string): Promise<{ title: string; image: string | null } | null> {
  const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`, { next: { revalidate: 86400 } });
  if (!res.ok) return null;
  const j = (await res.json()) as { title?: string; thumbnail_url?: string };
  return j.title ? { title: j.title, image: j.thumbnail_url ?? null } : null;
}

// -----------------------------------------------------------------------------
// Delivery and autopilot (run with the service-role client by cron/webhooks,
// or by a member's own action after RLS has confirmed they own the prospect)
// -----------------------------------------------------------------------------

const firstName = (n: string) => n.trim().split(/\s+/)[0];
const DAY = 86_400_000;

/** Lagos daytime (08:00–20:00) for messages nobody asked for. */
export function isSendingHours(now = new Date()) {
  const h = Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Africa/Lagos" }).format(now));
  return h >= 8 && h < 20;
}

export async function deliver(admin: Admin, prospect: Prospect, memberName: string, body: string, history: Pick<ProspectMessage, "direction" | "created_at">[]): Promise<SendResult> {
  const lastIn = [...history].reverse().find((m) => m.direction === "in");
  if (prospect.channel === "whatsapp") {
    if (!prospect.phone) return { ok: false, error: "This prospect has no phone number." };
    return sendWhatsApp(prospect.phone, body, {
      windowOpen: Boolean(lastIn && Date.now() - new Date(lastIn.created_at).getTime() < DAY),
      prospectFirst: firstName(prospect.full_name), memberFirst: firstName(memberName),
    });
  }
  if (prospect.channel === "email") {
    if (!prospect.email) return { ok: false, error: "This prospect has no email address." };
    const r = await sendGmail(admin, prospect.owner_id, prospect.email, `${firstName(memberName)} from Maximus`, body, prospect.email_thread_id);
    if (r.ok && r.threadId && r.threadId !== prospect.email_thread_id) {
      await admin.from("prospects").update({ email_thread_id: r.threadId }).eq("id", prospect.id);
    }
    return r;
  }
  return { ok: false, error: "This prospect is set to 'I'll send it myself'." };
}

async function memberName(admin: Admin, userId: string) {
  const { data } = await admin.from("profiles").select("full_name").eq("id", userId).single();
  return (data?.full_name as string | undefined) ?? "Your Maximus contact";
}

async function loadHistory(admin: Admin, prospectId: string) {
  const { data } = await admin.from("prospect_messages").select("direction, body, created_at, status")
    .eq("prospect_id", prospectId).order("created_at");
  return (data ?? []) as Pick<ProspectMessage, "direction" | "body" | "created_at" | "status">[];
}

/** Sends the AI's message, records it, and schedules the next step. */
export async function aiStep(admin: Admin, prospect: Prospect, mode: "next" | "reply") {
  const name = await memberName(admin, prospect.owner_id);
  const history = await loadHistory(admin, prospect.id);
  const plan = await planFollowUp({ prospect, history, memberName: name, mode });
  const update: Partial<Prospect> = {
    stage: plan.stage,
    next_follow_up_at: plan.stop || plan.follow_up_in_days === null ? null : new Date(Date.now() + plan.follow_up_in_days * DAY).toISOString(),
  };
  if (plan.stop) Object.assign(update, { autopilot: false });
  const body = plan.messages[0];
  if (body) {
    const sent = await deliver(admin, prospect, name, body, history);
    await admin.from("prospect_messages").insert({
      prospect_id: prospect.id, owner_id: prospect.owner_id, direction: "out", channel: prospect.channel,
      body: sent.ok && sent.usedTemplate ? `[WhatsApp opening message sent] ${body}` : body,
      status: sent.ok ? "sent" : "failed", ai_generated: true,
      external_id: sent.ok ? sent.externalId : null, error: sent.ok ? null : sent.error,
    });
    if (sent.ok) update.last_contacted_at = new Date().toISOString();
    else Object.assign(update, { autopilot: false, next_follow_up_at: null });
    if (!sent.ok) {
      await admin.rpc("notify", {
        p_user: prospect.owner_id, p_type: "prospect_update", p_title: `Follow-up to ${prospect.full_name} paused`,
        p_body: sent.error, p_link: `/prospects/${prospect.id}`, p_data: {},
      });
    }
  }
  await admin.from("prospects").update(update).eq("id", prospect.id);
  return plan;
}

/** A prospect's message arrived (WhatsApp webhook or Gmail poll). */
export async function handleInbound(admin: Admin, prospect: Prospect, text: string, externalId: string | null) {
  const { error } = await admin.from("prospect_messages").insert({
    prospect_id: prospect.id, owner_id: prospect.owner_id, direction: "in", channel: prospect.channel,
    body: text.slice(0, 4000), status: "received", external_id: externalId,
  });
  if (error) return; // duplicate delivery
  const now = new Date().toISOString();
  if (OPT_OUT.test(text)) {
    await admin.from("prospects").update({ last_reply_at: now, opted_out: true, autopilot: false, stage: "not_now", next_follow_up_at: null }).eq("id", prospect.id);
    await admin.rpc("notify", {
      p_user: prospect.owner_id, p_type: "prospect_update", p_title: `${prospect.full_name} asked not to be contacted`,
      p_body: "Automatic follow-up has stopped for this prospect.", p_link: `/prospects/${prospect.id}`, p_data: {},
    });
    return;
  }
  await admin.from("prospects").update({ last_reply_at: now }).eq("id", prospect.id);
  const fresh = { ...prospect, last_reply_at: now };
  let note = "Open the conversation to reply.";
  if (prospect.autopilot && !prospect.opted_out && isAiConfigured()) {
    try { await aiStep(admin, fresh, "reply"); note = "Maximus AI replied for you. Tap to read the conversation."; }
    catch { note = "Maximus AI couldn't reply this time. Open the conversation to answer."; }
  }
  await admin.rpc("notify", {
    p_user: prospect.owner_id, p_type: "prospect_update", p_title: `${prospect.full_name} replied`,
    p_body: `"${text.slice(0, 120)}" — ${note}`, p_link: `/prospects/${prospect.id}`, p_data: {},
  });
}

/** Daily job: send due follow-ups and pick up Gmail replies. */
export async function runAutopilot(admin: Admin, limit = 40) {
  const stats = { followUps: 0, paused: 0, emailReplies: 0, errors: 0 };
  if (!isAiConfigured()) return stats;

  const { data: emailProspects } = await admin.from("prospects").select("*")
    .eq("channel", "email").eq("opted_out", false).not("email_thread_id", "is", null).not("email", "is", null).limit(200);
  for (const p of (emailProspects ?? []) as Prospect[]) {
    const replies = await gmailReplies(admin, p.owner_id, p.email_thread_id!, p.email!);
    const { data: known } = await admin.from("prospect_messages").select("external_id").eq("prospect_id", p.id).not("external_id", "is", null);
    const seen = new Set((known ?? []).map((k) => k.external_id as string));
    for (const r of replies.filter((r) => !seen.has(r.id))) {
      await handleInbound(admin, p, r.text, r.id);
      stats.emailReplies++;
    }
  }

  if (!isSendingHours()) return stats;
  const { data: due } = await admin.from("prospects").select("*")
    .eq("autopilot", true).eq("opted_out", false).neq("channel", "manual")
    .lte("next_follow_up_at", new Date().toISOString()).order("next_follow_up_at").limit(limit);
  for (const p of (due ?? []) as Prospect[]) {
    const history = await loadHistory(admin, p.id);
    // Three unanswered follow-ups in a row: stop and let the member decide.
    let unanswered = 0;
    for (const m of [...history].reverse()) { if (m.direction === "in") break; if (m.status === "sent") unanswered++; }
    if (unanswered >= 3) {
      await admin.from("prospects").update({ autopilot: false, next_follow_up_at: null }).eq("id", p.id);
      await admin.rpc("notify", {
        p_user: p.owner_id, p_type: "prospect_update", p_title: `No reply from ${p.full_name} yet`,
        p_body: "Maximus AI sent 3 follow-ups with no answer, so it has paused. Try a call or a different approach.",
        p_link: `/prospects/${p.id}`, p_data: {},
      });
      stats.paused++;
      continue;
    }
    try { await aiStep(admin, p, "next"); stats.followUps++; } catch { stats.errors++; }
  }
  return stats;
}
