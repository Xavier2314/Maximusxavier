"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Refreshes the team view the moment someone joins anywhere in the viewer's branch. */
export function LiveTeam({ viewerId }: { viewerId: string }) {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const [joined, setJoined] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`team-${viewerId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "team_relationships", filter: `ancestor_id=eq.${viewerId}` },
        (payload) => {
          if (Number((payload.new as { depth?: number }).depth ?? 0) < 1) return;
          setJoined((n) => n + 1);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => router.refresh(), 600);
        })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { void supabase.removeChannel(channel); };
  }, [router, viewerId]);

  return (
    <>
      <span className="inline-flex h-9 items-center gap-2 rounded-full bg-surface px-3 text-sm ring-1 ring-border" role="status">
        <span className={`size-2 rounded-full ${live ? "animate-pulse bg-brand-green" : "bg-fg-subtle"}`} aria-hidden />
        {live ? "Live" : "Connecting…"}
      </span>
      {joined > 0 && (
        <div role="status" className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-2xl bg-brand-navy p-3 text-white shadow-xl animate-rise lg:bottom-6">
          <span className="grid size-9 place-items-center rounded-xl bg-brand-lime text-brand-navy"><UserPlus className="size-4" aria-hidden /></span>
          <p className="flex-1 text-sm"><b>{joined === 1 ? "Someone new" : `${joined} new people`}</b> just joined your team. The chart has been updated.</p>
          <button type="button" onClick={() => setJoined(0)} aria-label="Dismiss" className="grid size-11 place-items-center rounded-lg hover:bg-white/10"><X className="size-4" /></button>
        </div>
      )}
    </>
  );
}
