import "server-only";

/** Daily.co video calls. The API key stays on the server; members get a short-lived room token. */
const API = "https://api.daily.co/v1";
const HOURS = 3;

export const isDailyConfigured = () => Boolean(process.env.DAILY_API_KEY);

async function daily<T>(path: string, init?: RequestInit): Promise<{ ok: boolean; status: number; data: T }> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${process.env.DAILY_API_KEY}`, "Content-Type": "application/json", ...init?.headers },
    cache: "no-store",
  });
  return { ok: res.ok, status: res.status, data: (await res.json().catch(() => ({}))) as T };
}

/** Creates the private room for a call (or returns it if it exists). Returns its URL. */
export async function ensureRoom(name: string, video: boolean): Promise<string> {
  const existing = await daily<{ url?: string }>(`/rooms/${encodeURIComponent(name)}`);
  if (existing.ok && existing.data.url) return existing.data.url;
  const created = await daily<{ url?: string; info?: string; error?: string }>("/rooms", {
    method: "POST",
    body: JSON.stringify({
      name,
      privacy: "private",
      properties: {
        exp: Math.floor(Date.now() / 1000) + HOURS * 3600,
        eject_at_room_exp: true,
        start_video_off: !video,
        enable_prejoin_ui: false,
        enable_screenshare: true,
        enable_chat: true,
        max_participants: 200,
      },
    }),
  });
  if (!created.ok || !created.data.url) throw new Error(created.data.info ?? created.data.error ?? `Daily room error ${created.status}`);
  return created.data.url;
}

/** A token that lets one member into one room for a few hours. */
export async function meetingToken(room: string, userName: string, isOwner: boolean): Promise<string> {
  const r = await daily<{ token?: string; info?: string }>("/meeting-tokens", {
    method: "POST",
    body: JSON.stringify({
      properties: { room_name: room, user_name: userName.slice(0, 60), is_owner: isOwner, exp: Math.floor(Date.now() / 1000) + HOURS * 3600 },
    }),
  });
  if (!r.ok || !r.data.token) throw new Error(r.data.info ?? `Daily token error ${r.status}`);
  return r.data.token;
}
