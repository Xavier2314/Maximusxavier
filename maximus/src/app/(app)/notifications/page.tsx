import { Bell, Settings } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Notification } from "@/lib/types";
import { NotificationList } from "./notification-list";

export const metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const viewer = await requireViewer();
  const { filter } = await searchParams;
  const supabase = await createClient();
  let q = supabase.from("notifications").select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", viewer.id).order("created_at", { ascending: false }).limit(100);
  if (filter === "unread") q = q.is("read_at", null);
  const { data } = await q.returns<Notification[]>();

  return (
    <>
      <PageHeader eyebrow="Inbox" title="Notifications"
        action={<LinkButton href="/settings#notifications" variant="outline" size="sm"><Settings className="size-4" aria-hidden /> Preferences</LinkButton>} />
      <Card>
        {data && data.length > 0 ? (
          <NotificationList items={data} filter={filter === "unread" ? "unread" : "all"} />
        ) : (
          <EmptyState icon={<Bell className="size-6" />} title={filter === "unread" ? "No unread notifications" : "No notifications yet"}
            description="Goal reviews, reminders, team updates and announcements will appear here." />
        )}
      </Card>
    </>
  );
}
