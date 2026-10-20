export type ProspectStage =
  | "new" | "contacted" | "interested" | "presentation" | "follow_up" | "joined" | "customer" | "not_now";
export type ProspectChannel = "whatsapp" | "email" | "manual";

export type Prospect = {
  id: string;
  owner_id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  source: string | null;
  stage: ProspectStage;
  channel: ProspectChannel;
  notes: string | null;
  autopilot: boolean;
  opted_out: boolean;
  email_thread_id: string | null;
  next_follow_up_at: string | null;
  last_contacted_at: string | null;
  last_reply_at: string | null;
  tags: string[];
  custom: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ContactEvent = { id: string; kind: "funnel_lead" | "funnel_order" | "form_response" | "imported" | "note"; title: string; detail: Record<string, unknown>; created_at: string };

export type ProspectMessage = {
  id: string;
  prospect_id: string;
  owner_id: string;
  direction: "out" | "in";
  channel: ProspectChannel;
  body: string;
  status: "draft" | "sent" | "failed" | "received" | "logged";
  ai_generated: boolean;
  attachment_url: string | null;
  error: string | null;
  created_at: string;
};

export const STAGES: { key: ProspectStage; label: string; dot: string }[] = [
  { key: "new", label: "New", dot: "bg-fg-subtle" },
  { key: "contacted", label: "Contacted", dot: "bg-brand-blue" },
  { key: "interested", label: "Interested", dot: "bg-[#7c3aed]" },
  { key: "presentation", label: "Presentation", dot: "bg-[#0e7490]" },
  { key: "follow_up", label: "Following up", dot: "bg-[#b45309]" },
  { key: "joined", label: "Joined", dot: "bg-brand-green" },
  { key: "customer", label: "Customer", dot: "bg-[#4f9a10]" },
  { key: "not_now", label: "Not now", dot: "bg-danger" },
];
export const stageLabel = (s: ProspectStage) => STAGES.find((x) => x.key === s)?.label ?? s;

export const CHANNEL_LABELS: Record<ProspectChannel, string> = {
  whatsapp: "WhatsApp",
  email: "Email (Gmail)",
  manual: "I'll send it myself",
};

/** Nigerian-friendly phone normalisation: "0803 123 4567" → "2348031234567". */
export function normalizePhone(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let d = raw.replace(/[^0-9]/g, "");
  if (d.startsWith("00")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0")) d = `234${d.slice(1)}`;
  if (d.length === 10 && /^[789]/.test(d)) d = `234${d}`;
  return d.length >= 7 && d.length <= 15 ? d : null;
}

/** Opens WhatsApp with the message ready to send from the member's own phone. */
export const whatsappLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

export const isSpotifyUrl = (url: string) => /^https:\/\/open\.spotify\.com\/(intl-[a-z-]+\/)?(track|episode|show|playlist|album|artist)\/[A-Za-z0-9]+/.test(url);

/** Words that mean "stop messaging me". Autopilot stops for good when it sees one. */
export const OPT_OUT = /^\s*(stop|unsubscribe|leave me alone|don'?t (message|text|contact) me|not interested)\b/i;
