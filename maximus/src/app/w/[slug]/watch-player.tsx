"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Radio, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type YTPlayer = {
  playVideo(): void; pauseVideo(): void; seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number; getPlayerState(): number; destroy(): void;
};
type YTNamespace = { Player: new (el: HTMLElement, opts: object) => YTPlayer; PlayerState: { PLAYING: number; PAUSED: number; BUFFERING: number } };
declare global { interface Window { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void } }

type Sync = { t: number; playing: boolean; at: number };

function loadYouTube(): Promise<YTNamespace> {
  return new Promise((resolve) => {
    if (window.YT?.Player) return resolve(window.YT);
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); if (window.YT) resolve(window.YT); };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const s = document.createElement("script");
      s.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(s);
    }
  });
}

/**
 * YouTube player. With "watch together" on, the host's play, pause and skips are
 * broadcast and everyone else follows. Viewers can still pause for themselves.
 */
export function WatchPlayer({ slug, videoId, sync, isHost }: { slug: string; videoId: string; sync: boolean; isHost: boolean }) {
  const box = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const last = useRef<Sync | null>(null);
  const [ready, setReady] = useState(false);
  const [joined, setJoined] = useState(isHost || !sync);
  const [viewers, setViewers] = useState(0);
  const [hostLive, setHostLive] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadYouTube().then((YT) => {
      if (cancelled || !box.current) return;
      player.current = new YT.Player(box.current, {
        videoId,
        playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
        events: { onReady: () => setReady(true) },
      });
    });
    return () => { cancelled = true; player.current?.destroy(); player.current = null; };
  }, [videoId]);

  // Apply the host's position to this viewer.
  function follow(s: Sync) {
    const p = player.current;
    if (!p) return;
    const target = s.t + (s.playing ? (Date.now() - s.at) / 1000 : 0);
    if (Math.abs(p.getCurrentTime() - target) > 2) p.seekTo(target, true);
    const playing = p.getPlayerState() === 1;
    if (s.playing && !playing) p.playVideo();
    if (!s.playing && playing) p.pauseVideo();
  }

  useEffect(() => {
    if (!sync || !ready) return;
    const supabase = createClient();
    const ch = supabase.channel(`watch:${slug}`, { config: { broadcast: { self: false }, presence: { key: isHost ? "host" : crypto.randomUUID() } } });
    const snapshot = (): Sync | null => {
      const p = player.current;
      return p ? { t: p.getCurrentTime(), playing: p.getPlayerState() === 1, at: Date.now() } : null;
    };
    ch.on("broadcast", { event: "sync" }, ({ payload }) => {
      if (isHost) return;
      last.current = payload as Sync;
      setHostLive(true);
      if (joined) follow(payload as Sync);
    });
    ch.on("broadcast", { event: "hello" }, () => {
      if (!isHost) return;
      const s = snapshot();
      if (s) void ch.send({ type: "broadcast", event: "sync", payload: s });
    });
    ch.on("presence", { event: "sync" }, () => {
      const keys = Object.keys(ch.presenceState());
      setViewers(keys.filter((k) => k !== "host").length);
      setHostLive(keys.includes("host"));
    });
    ch.subscribe((status) => {
      if (status !== "SUBSCRIBED") return;
      void ch.track({ joined_at: Date.now() });
      if (!isHost) void ch.send({ type: "broadcast", event: "hello", payload: {} });
    });
    // The host sends its position every few seconds so late joiners catch up.
    const beat = isHost ? setInterval(() => {
      const s = snapshot();
      if (s) void ch.send({ type: "broadcast", event: "sync", payload: s });
    }, 3000) : undefined;
    return () => { if (beat) clearInterval(beat); void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sync, ready, slug, isHost, joined]);

  function join() {
    setJoined(true);
    if (last.current) follow(last.current);
    else player.current?.playVideo();
  }

  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black shadow-2xl ring-1 ring-white/10">
        <div ref={box} className="absolute inset-0 size-full [&>iframe]:size-full" />
        {!joined && (
          <button type="button" onClick={join} disabled={!ready}
            className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
            <span className="flex flex-col items-center gap-3">
              <span className="grid size-20 place-items-center rounded-full bg-brand-lime text-brand-navy shadow-xl"><Play className="size-9 translate-x-0.5" aria-hidden /></span>
              <span className="text-lg font-bold">{ready ? (hostLive ? "Join the watch party" : "Tap to watch") : "Loading…"}</span>
            </span>
          </button>
        )}
      </div>
      {sync && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-white/75">
          {hostLive ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-danger px-2.5 py-1 text-xs font-bold text-white"><Radio className="size-3.5" aria-hidden />LIVE</span>
          ) : (
            <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs">{isHost ? "You are the host" : "Host not here yet: watch at your own pace"}</span>
          )}
          <span className="inline-flex items-center gap-1.5"><Users className="size-4" aria-hidden />{viewers} watching</span>
          {isHost && <span className="text-xs text-white/55">Everyone follows your play, pause and skip.</span>}
        </div>
      )}
    </div>
  );
}
