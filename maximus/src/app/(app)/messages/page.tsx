import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ChatRoom, type ChatMessage } from "./chat-room";

export const metadata = { title: "Partner chat" };

type Conv = { id: string; other_id: string; full_name: string; avatar_url: string | null; last_message_at: string | null; unread: number; can_send: boolean; last_seen: string | null };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const viewer = await requireViewer();
  const { c } = await searchParams;
  const supabase = await createClient();
  const { data: partner } = await supabase.rpc("my_partnership");
  if (((partner ?? []) as unknown[]).length) await supabase.rpc("open_partner_chat");
  const { data: convs } = await supabase.rpc("my_conversations");
  const list = (convs ?? []) as Conv[];
  const current = list.find((x) => x.id === c) ?? list.find((x) => x.can_send) ?? list[0];

  if (!current) {
    return (
      <>
        <PageHeader eyebrow="Accountability" title="Partner chat" />
        <Card><EmptyState icon={<MessageCircle className="size-6" aria-hidden />} title="No chats yet"
          description="Private chat opens once you have an accountability partner."
          action={<Link href="/tools/accountability" className="text-primary">Find a partner</Link>} /></Card>
      </>
    );
  }

  const [{ data: msgs }, { data: myGoals }] = await Promise.all([
    supabase.from("messages").select("*").eq("conversation_id", current.id).order("created_at", { ascending: false }).limit(60),
    supabase.from("tool_goals").select("id, title, progress, target, unit").eq("user_id", viewer.id).eq("status", "active").limit(30),
  ]);
  const messages = ((msgs ?? []) as ChatMessage[]).reverse();
  const goalIds = [...new Set(messages.map((m) => m.goal_id).filter(Boolean) as string[])];
  const { data: goals } = goalIds.length
    ? await supabase.from("tool_goals").select("id, title, progress, target, unit, user_id").in("id", goalIds)
    : { data: [] };

  return (
    <>
      {list.length > 1 && (
        <nav className="mb-3 flex gap-2 overflow-x-auto" aria-label="Conversations">
          {list.map((x) => (
            <Link key={x.id} href={`/messages?c=${x.id}`} className={`shrink-0 rounded-full px-3 py-1 text-sm ${x.id === current.id ? "bg-primary text-primary-fg" : "bg-surface-muted"}`}>
              {x.full_name.split(" ")[0]}{x.unread ? ` (${x.unread})` : ""}{x.can_send ? "" : " · ended"}
            </Link>
          ))}
        </nav>
      )}
      <ChatRoom key={current.id} conversationId={current.id} viewerId={viewer.id}
        other={{ id: current.other_id, name: current.full_name, avatar: current.avatar_url }}
        canSend={current.can_send} otherLastRead={current.last_seen} initial={messages}
        goals={((goals ?? []) as { id: string; title: string; progress: number; target: number | null; unit: string | null }[])}
        myGoals={((myGoals ?? []) as { id: string; title: string; progress: number; target: number | null; unit: string | null }[])} />
    </>
  );
}
