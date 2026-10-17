"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  Bell, Cake, CheckCheck, ClipboardCheck, GraduationCap, Megaphone, ShoppingBag, Target, Trophy, UserPlus, Wallet, MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Notification } from "@/lib/types";
import { cn, formatRelative } from "@/lib/utils";
import { markReadAction } from "./actions";

const ICONS: Record<string, typeof Bell> = {
  goal_submitted: Target, goal_reminder: Target, sponsor_feedback: Target,
  evaluation_reminder: ClipboardCheck, evaluation_completed: ClipboardCheck,
  team_registration: UserPlus, order_recorded: ShoppingBag, order_milestone: Trophy,
  fund_update: Wallet, birthday: Cake, anniversary: Trophy, recognition: Trophy,
  training_announcement: GraduationCap, admin_announcement: Megaphone, attendance_update: MapPin,
};

export function NotificationList({ items, filter }: { items: Notification[]; filter: "all" | "unread" }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const unread = items.filter((n) => !n.read_at).length;

  function open(n: Notification) {
    start(async () => {
      if (!n.read_at) await markReadAction([n.id]);
      router.push(n.link ?? "/notifications");
    });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <div className="flex rounded-xl bg-surface-muted p-1" role="tablist" aria-label="Filter">
          {(["all", "unread"] as const).map((f) => (
            <Link key={f} href={f === "all" ? "/notifications" : "/notifications?filter=unread"} role="tab" aria-selected={filter === f}
              className={cn("rounded-lg px-3 py-1.5 text-sm font-medium capitalize", filter === f ? "bg-surface shadow-sm" : "text-fg-muted")}>{f}</Link>
          ))}
        </div>
        {unread > 0 && (
          <Button variant="ghost" size="sm" disabled={pending} onClick={() => start(async () => { await markReadAction(null); router.refresh(); })}>
            <CheckCheck className="size-4" aria-hidden /> Mark all as read
          </Button>
        )}
      </div>
      <ul className="divide-y divide-border">
        {items.map((n) => {
          const Icon = ICONS[n.type] ?? Bell;
          return (
            <li key={n.id}>
              <button type="button" onClick={() => open(n)} disabled={pending}
                className={cn("flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-surface-muted/60", !n.read_at && "bg-primary-soft/40")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", n.read_at ? "bg-surface-muted text-fg-subtle" : "bg-primary text-white")}>
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-2">
                    <span className={cn("text-sm", !n.read_at && "font-semibold")}>{n.title}</span>
                    <span className="shrink-0 text-xs text-fg-subtle">{formatRelative(n.created_at)}</span>
                  </span>
                  {n.body && <span className="mt-0.5 block text-sm text-fg-muted">{n.body}</span>}
                </span>
                {!n.read_at && <span className="mt-2 size-2 shrink-0 rounded-full bg-brand-green" aria-label="Unread" />}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
