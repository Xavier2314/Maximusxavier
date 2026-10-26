import { DateTime } from "luxon";

export const TZ_DEFAULT = "Africa/Lagos";

export const t12 = (iso: string, tz: string) => DateTime.fromISO(iso, { setZone: true }).setZone(tz).toFormat("h:mm a");
export const t12s = (iso: string, tz: string) => {
  const d = DateTime.fromISO(iso, { setZone: true }).setZone(tz);
  return d.minute ? d.toFormat("h:mm a") : d.toFormat("h a");
};
export const dayLabel = (iso: string, tz: string, fmt = "ccc d LLL") => DateTime.fromISO(iso, { setZone: true }).setZone(tz).toFormat(fmt);
export const hhmmTo12 = (hhmm: string) => DateTime.fromFormat(hhmm.slice(0, 5), "HH:mm").toFormat("h:mm a");

export function countdown(ms: number): string {
  if (ms <= 0) return "now";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m`;
  if (m >= 10) return `${m}m`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export const durationLabel = (min: number) => (min < 60 ? `${min} min` : min % 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min / 60} h`);

export const CLASS_LABEL: Record<string, string> = { fixed: "Fixed", flexible: "Flexible", essential: "Essential", optional: "Optional" };

export const offsetLabel = (anchor: string, off: number) => {
  const at = anchor === "end" ? "end" : "start";
  if (off === 0) return `At ${at}`;
  const a = Math.abs(off);
  const v = a % 1440 === 0 ? `${a / 1440} day${a > 1440 ? "s" : ""}` : a % 60 === 0 ? `${a / 60} h` : `${a} min`;
  return off < 0 ? `${v} before ${at}` : `${v} after ${at}`;
};
