"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PhoneOff } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { endCallAction } from "../actions";

/** Full-screen call. Daily's call frame provides mute, camera, speaker and screen share. */
export function CallScreen({ callId, src, title, video, back, canEndForAll }: {
  callId: string; src: string; title: string; video: boolean; back: string; canEndForAll: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ended, setEnded] = useState(false);

  // Leave when the other side (or the host) ends the call.
  useEffect(() => {
    const supabase = createClient();
    const ch = supabase.channel(`call:${callId}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "calls", filter: `id=eq.${callId}` }, (p) => {
        if ((p.new as { status?: string }).status === "ended") setEnded(true);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [callId]);

  useEffect(() => {
    if (!ended) return;
    const t = setTimeout(() => router.replace(back), 1500);
    return () => clearTimeout(t);
  }, [ended, back, router]);

  function hangUp() {
    start(async () => {
      if (canEndForAll) await endCallAction(callId);
      router.replace(back);
    });
  }

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-brand-navy text-white">
      <div className="flex items-center gap-3 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{title}</p>
          <p className="text-xs text-white/60">{ended ? "Call ended" : video ? "Video call" : "Voice call"}</p>
        </div>
        <button type="button" onClick={hangUp} disabled={pending}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-danger px-4 text-sm font-semibold text-white hover:opacity-90">
          <PhoneOff className="size-4" aria-hidden />{canEndForAll ? "End" : "Leave"}
        </button>
      </div>
      {ended ? (
        <div className="grid flex-1 place-items-center text-white/70">The call has ended.</div>
      ) : (
        <iframe src={src} title={`Call with ${title}`} className="w-full flex-1 border-0"
          allow="camera; microphone; fullscreen; speaker; display-capture; autoplay; clipboard-write" />
      )}
    </div>
  );
}
