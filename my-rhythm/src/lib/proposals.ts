import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { must } from "./api";
import type { ScheduleData } from "./types";
import { analyzeDrafts, type ProposalPayload } from "./schedule/analyze";
import { findTimeProposal, type FindTimeRequest } from "./schedule/findTime";
import type { ActivityDraft } from "./schedule/draft";
import { explainProposal } from "./ai/claude";

export type ProposalSource = "quick_add" | "ai_chat" | "voice" | "travel" | "find_time" | "manual_check";

export interface SavedProposal {
  id: string;
  title: string;
  summary: string | null;
  ai_explanation: string | null;
  payload: ProposalPayload;
  status: string;
  created_at: string;
}

function deterministicSummary(p: ProposalPayload): string {
  const overlaps = p.conflicts.filter((c) => c.type === "overlap" && c.occurrence);
  if (!overlaps.length) {
    const other = p.conflicts.filter((c) => c.type !== "duplicate");
    return other.length ? `No overlaps, but ${other.length} thing${other.length > 1 ? "s" : ""} to note.` : "No conflicts — this fits into your schedule.";
  }
  const titles = [...new Set(overlaps.map((c) => `${c.occurrence!.title} (${DateTime.fromISO(c.occurrence!.start).setZone(p.timezone).toFormat("ccc")})`))];
  return `This conflicts with ${titles.slice(0, 6).join(", ")}${titles.length > 6 ? ` and ${titles.length - 6} more` : ""}.`;
}

export async function saveProposal(
  sb: SupabaseClient,
  userId: string,
  source: ProposalSource,
  title: string,
  payload: ProposalPayload,
  data: ScheduleData,
): Promise<SavedProposal> {
  let finalPayload = payload;
  let ai: string | null = null;
  if (data.preferences.ai_enabled && (payload.conflicts.length > 0 || source === "travel")) {
    const explained = await explainProposal(payload, data.preferences.priorities);
    if (explained) {
      finalPayload = explained.payload;
      ai = explained.summary;
    }
  }
  return must(
    await sb
      .from("schedule_proposals")
      .insert({ user_id: userId, source, title, summary: deterministicSummary(payload), ai_explanation: ai, payload: finalPayload })
      .select()
      .single(),
    "save proposal",
  ) as SavedProposal;
}

export async function proposeDrafts(
  sb: SupabaseClient,
  userId: string,
  data: ScheduleData,
  drafts: ActivityDraft[],
  source: ProposalSource,
  trip?: { destination: string; prepMinutes: number; tripId?: string } | null,
) {
  const payload = analyzeDrafts(drafts, data, { trip });
  const title = trip ? `Trip to ${trip.destination}` : drafts.length === 1 ? `Add “${drafts[0].title}”` : `Add ${drafts.length} activities`;
  return saveProposal(sb, userId, source, title, payload, data);
}

export async function proposeFindTime(sb: SupabaseClient, userId: string, data: ScheduleData, req: FindTimeRequest) {
  const payload = findTimeProposal(req, data);
  return saveProposal(sb, userId, "find_time", `Find ${req.durationMinutes} min for ${req.title}`, payload, data);
}
