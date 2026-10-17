"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Re-renders the board whenever an attendance row changes (Supabase Realtime). */
export function LiveRefresh() {
  const router = useRouter();
  const [live, setLive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("attendance-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "attendance" }, () => {
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 400);
      })
      .subscribe((status) => setLive(status === "SUBSCRIBED"));
    return () => { void supabase.removeChannel(channel); };
  }, [router]);

  return (
    <span className="inline-flex items-center gap-2 rounded-full bg-surface px-3 py-1.5 text-sm ring-1 ring-border" role="status">
      <span className={`size-2 rounded-full ${live ? "animate-pulse bg-brand-green" : "bg-fg-subtle"}`} aria-hidden />
      {live ? "Live" : "Connecting…"}
    </span>
  );
}
