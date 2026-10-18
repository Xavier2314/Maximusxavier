"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, MessageCircle, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { motivationFor } from "@/lib/motivation";

type Popup = { id: string; type: string; title: string; body: string | null; link: string | null };

/** Unread counter that updates live through Supabase Realtime, plus a pop-up for each new notification. */
export function NotificationBell({ userId, initialUnread }: { userId: string; initialUnread: number }) {
  const [unread, setUnread] = useState(initialUnread);
  const [popup, setPopup] = useState<Popup | null>(null);
  const pathname = usePathname();
  const pathRef = useRef(pathname);
  pathRef.current = pathname;

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
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` }, (change) => {
        void refresh();
        if (change.eventType !== "INSERT") return;
        const n = change.new as Popup;
        // Already reading the chat: the message itself is on screen.
        if (n.type === "chat_message" && pathRef.current?.startsWith("/messages")) return;
        setPopup(n);
        try { navigator.vibrate?.(80); } catch { /* not supported */ }
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [userId]);

  useEffect(() => {
    if (!popup) return;
    const t = setTimeout(() => setPopup(null), 9000);
    return () => clearTimeout(t);
  }, [popup]);

  return (
    <>
    {popup && <NotificationPopup n={popup} onClose={() => setPopup(null)} />}
    <Link href="/notifications" className="relative grid size-10 place-items-center rounded-xl text-fg-muted hover:bg-surface-muted hover:text-fg"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}>
      <Bell className="size-5" aria-hidden />
      {unread > 0 && (
        <span className="absolute right-1 top-1 grid min-w-[18px] place-items-center rounded-full bg-brand-green px-1 text-[10px] font-bold leading-[18px] text-brand-navy ring-2 ring-bg">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </Link>
    </>
  );
}

function NotificationPopup({ n, onClose }: { n: Popup; onClose: () => void }) {
  const Icon = n.type === "chat_message" ? MessageCircle : Bell;
  return (
    <div role="status" aria-live="polite"
      className="fixed inset-x-3 top-[max(0.75rem,env(safe-area-inset-top))] z-[60] mx-auto max-w-md animate-rise rounded-2xl bg-surface p-3 shadow-[var(--shadow-card)] ring-1 ring-border sm:left-auto sm:right-4">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="size-5" aria-hidden /></span>
        <Link href={n.link || "/notifications"} onClick={onClose} className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-fg">{n.title}</p>
          {n.body && <p className="line-clamp-2 text-sm text-fg-muted">{n.body}</p>}
          <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-success">
            <Sparkles className="size-3.5 shrink-0" aria-hidden />{motivationFor(n.id)}
          </p>
        </Link>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-lg text-fg-subtle hover:bg-surface-muted">
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
