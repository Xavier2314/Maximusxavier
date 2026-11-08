/** Pushed checklists: shared types and the timer arithmetic used on Home and in the admin view. */

export type ChecklistItem = { id: string; checklist_id: string; position: number; title: string; minutes: number };
export type ItemProgress = {
  item_id: string; user_id: string; started_at: string | null; paused_at: string | null;
  paused_seconds: number; completed_at: string | null;
};

/** Seconds worked on an item so far (pauses left out). */
export function workedSeconds(p: ItemProgress | undefined, now: number = Date.now()) {
  if (!p?.started_at) return 0;
  const end = p.completed_at ? Date.parse(p.completed_at) : p.paused_at ? Date.parse(p.paused_at) : now;
  return Math.max(0, Math.round((end - Date.parse(p.started_at)) / 1000) - p.paused_seconds);
}

export const isRunning = (p?: ItemProgress) => Boolean(p?.started_at && !p.paused_at && !p.completed_at);

/** "1 h", "30 min", "1 h 30 min". */
export function formatMinutes(min: number) {
  const h = Math.floor(min / 60), m = min % 60;
  return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ") || "0 min";
}

/** "48:12" for a countdown, "+04:10" once over time. */
export function formatClock(seconds: number) {
  const over = seconds < 0, s = Math.abs(seconds);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const body = h ? `${h}:${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}` : `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
  return over ? `+${body}` : body;
}

export const MINUTE_CHOICES = [10, 15, 20, 30, 45, 60, 90, 120, 180, 240, 300, 360, 480];
