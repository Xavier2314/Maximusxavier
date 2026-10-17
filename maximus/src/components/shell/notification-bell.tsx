"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Unread counter that updates live through Supabase Realtime. */
export function NotificationBell({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);

  useEffect(() => setUnread(initialUnread), [initialUnread]);

  useEffect(() => {
    const supabase = createClient();
    const refresh = async () => {
      const { count } = await supabase.from("notifications").select("id", { count: "exact", head: true })
        .eq("user_id", userId).is("read_at", null);
      if (typeof count === "number") setUnread(count);
    };
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, refresh)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  return (
    <Link href="/notifications" className="relative grid size-10 place-items-center rounded-xl text-fg-muted hover:bg-surface-muted hover:text-fg"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}>
      <Bell className="size-5" aria-hidden />
      {unread > 0 && (
        <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-brand-green px-1 text-[10px] font-bold leading-[18px] text-brand-navy ring-2 ring-bg">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
  );
}
