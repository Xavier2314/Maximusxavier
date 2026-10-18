/** The video a Super Admin features for everyone (app_settings key "featured_video"). */
export type FeaturedVideo = {
  youtube_id: string; title: string; message: string | null; popup: boolean; active: boolean; updated_at: string;
};

export function featuredFrom(value: unknown): FeaturedVideo | null {
  const v = value as Partial<FeaturedVideo> | null;
  if (!v?.active || !v.youtube_id || !/^[A-Za-z0-9_-]{11}$/.test(v.youtube_id)) return null;
  return { youtube_id: v.youtube_id, title: v.title ?? "Featured video", message: v.message ?? null, popup: Boolean(v.popup), active: true, updated_at: v.updated_at ?? "" };
}

export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;
export const youtubeEmbedUrl = (id: string, autoplay = false) =>
  `https://www.youtube-nocookie.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${autoplay ? "&autoplay=1" : ""}`;
