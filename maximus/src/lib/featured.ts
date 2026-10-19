import { youtubeId, youtubeThumb } from "@/lib/youtube";

/** A featured video set by a Super Admin (app_settings "featured_video") or by a company (offices.featured_video). */
export type VideoProvider = "youtube" | "loom";
export type FeaturedVideo = {
  provider: VideoProvider; video_id: string; title: string; message: string | null; popup: boolean; active: boolean; updated_at: string;
};

const LOOM_ID = /^[a-f0-9]{32}$/;

/** Reads a YouTube or Loom link (or a bare id) into a provider + id. */
export function parseVideoLink(input: string): { provider: VideoProvider; video_id: string } | null {
  const s = input.trim();
  const loom = s.match(/loom\.com\/(?:share|embed)\/([a-f0-9]{32})/i);
  if (loom) return { provider: "loom", video_id: loom[1].toLowerCase() };
  if (LOOM_ID.test(s)) return { provider: "loom", video_id: s };
  const yt = youtubeId(s);
  return yt ? { provider: "youtube", video_id: yt } : null;
}

export function featuredFrom(value: unknown): FeaturedVideo | null {
  const v = value as (Partial<FeaturedVideo> & { youtube_id?: string }) | null;
  if (!v?.active) return null;
  // Older settings stored only youtube_id.
  const provider: VideoProvider = v.provider === "loom" ? "loom" : "youtube";
  const id = v.video_id ?? v.youtube_id;
  if (!id || (provider === "youtube" ? !/^[A-Za-z0-9_-]{11}$/.test(id) : !LOOM_ID.test(id))) return null;
  return { provider, video_id: id, title: v.title ?? "Featured video", message: v.message ?? null, popup: Boolean(v.popup), active: true, updated_at: v.updated_at ?? "" };
}

export const videoWatchUrl = (v: FeaturedVideo) =>
  v.provider === "loom" ? `https://www.loom.com/share/${v.video_id}` : `https://www.youtube.com/watch?v=${v.video_id}`;
export const videoEmbedUrl = (v: FeaturedVideo, autoplay = false) =>
  v.provider === "loom"
    ? `https://www.loom.com/embed/${v.video_id}?hide_owner=true&hide_share=true${autoplay ? "&autoplay=1" : ""}`
    : `https://www.youtube-nocookie.com/embed/${v.video_id}?rel=0&modestbranding=1&playsinline=1${autoplay ? "&autoplay=1" : ""}`;
export const videoThumbUrl = (v: FeaturedVideo) =>
  v.provider === "loom" ? `https://cdn.loom.com/sessions/thumbnails/${v.video_id}-with-play.gif` : youtubeThumb(v.video_id);
export const videoShareLink = (v: FeaturedVideo) =>
  v.provider === "loom" ? `https://www.loom.com/share/${v.video_id}` : `https://youtu.be/${v.video_id}`;
export const providerName = (v: FeaturedVideo) => (v.provider === "loom" ? "Loom" : "YouTube");
