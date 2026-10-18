import Link from "next/link";
import { ArrowLeft, Lock, MessageCircle } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar, EmptyState } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { ChatButton } from "./chat-button";
import { ChatRoom, type ChatMessage } from "./chat-room";

export const metadata = { title: "Private chats" };

type Conv = { id: string; other_id: string; full_name: string; avatar_url: string | null; last_message_at: string | null; unread: number; can_send: boolean; last_seen: string | null; kind: "partner" | "team" };
type Goal = { id: string; title: string; progress: number; target: number | null; unit: string | null };

export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const viewer = await requireViewer();
  const { c } = await searchParams;
  const supabase = await createClient();
  const { data: partner } = await supabase.rpc("my_partnership");
  if (((partner ?? []) as unknown[]).length) await supabase.rpc("open_partner_chat");
  const [{ data: convs }, { data: sponsor }, { data: downline }] = await Promise.all([
    supabase.rpc("my_chats"),
    viewer.profile.sponsor_id ? supabase.from("profiles").select("id, full_name, avatar_url").eq("id", viewer.profile.sponsor_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("profiles").select("id, full_name, avatar_url").eq("sponsor_id", viewer.id).eq("status", "active").order("full_name").limit(100),
  ]);
  const list = (convs ?? []) as Conv[];
  const current = c ? list.find((x) => x.id === c) : list.find((x) => x.kind === "partner" && x.can_send) ?? list[0];
  const withChat = new Set(list.map((x) => x.other_id));
  const starters = [
    ...(viewer.profile.sponsor_id && !withChat.has(viewer.profile.sponsor_id)
      ? [{ id: viewer.profile.sponsor_id, full_name: (sponsor as { full_name?: string } | null)?.full_name ?? "My sponsor", avatar_url: (sponsor as { avatar_url?: string | null } | null)?.avatar_url ?? null, tag: "Sponsor" }] : []),
    ...((downline ?? []) as { id: string; full_name: string; avatar_url: string | null }[]).filter((d) => !withChat.has(d.id)).map((d) => ({ ...d, tag: "Your team" })),
  ];

  let room: React.ReactNode = null;
  if (current) {
    const [{ data: msgs }, { data: myGoals }] = await Promise.all([
      supabase.from("messages").select("*").eq("conversation_id", current.id).order("created_at", { ascending: false }).limit(60),
      supabase.from("tool_goals").select("id, title, progress, target, unit").eq("user_id", viewer.id).eq("status", "active").limit(30),
    ]);
    const messages = ((msgs ?? []) as ChatMessage[]).reverse();
    const goalIds = [...new Set(messages.map((m) => m.goal_id).filter(Boolean) as string[])];
    const { data: goals } = goalIds.length ? await supabase.from("tool_goals").select("id, title, progress, target, unit").in("id", goalIds) : { data: [] };
    room = (
      <ChatRoom key={current.id} conversationId={current.id} viewerId={viewer.id} kind={current.kind}
        other={{ id: current.other_id, name: current.full_name, avatar: current.avatar_url }}
        canSend={current.can_send} otherLastRead={current.last_seen} initial={messages}
        goals={(goals ?? []) as Goal[]} myGoals={(myGoals ?? []) as Goal[]} />
    );
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Link href="/tools/accountability" className="inline-flex items-center gap-1 text-sm text-primary"><ArrowLeft className="size-4" aria-hidden /> Accountability</Link>
        <p className="inline-flex items-center gap-1.5 text-xs text-fg-muted"><Lock className="size-3.5" aria-hidden /> Each chat is private to the two people in it.</p>
      </div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside className={cn("space-y-4", current && c && "hidden lg:block")}>
          <Card>
            <CardBody className="space-y-1 p-2">
              <p className="px-2 pt-1 text-xs font-semibold uppercase tracking-wide text-fg-subtle">Chats</p>
              {list.length === 0 && <p className="px-2 py-3 text-sm text-fg-muted">No chats yet.</p>}
              {list.map((x) => (
                <Link key={x.id} href={`/messages?c=${x.id}`} className={cn("flex items-center gap-3 rounded-xl px-2 py-2", current?.id === x.id ? "bg-primary-soft" : "hover:bg-surface-muted")}>
                  <Avatar name={x.full_name} src={x.avatar_url} size={36} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{x.full_name}</span>
                    <span className="block text-xs text-fg-muted">{x.kind === "partner" ? "Accountability partner" : "Sponsor line"}{x.can_send ? "" : " · read-only"}</span>
                  </span>
                  {x.unread > 0 && <span className="grid min-w-5 place-items-center rounded-full bg-brand-green px-1.5 text-[11px] font-bold text-brand-navy">{x.unread}</span>}
                </Link>
              ))}
            </CardBody>
          </Card>
          {starters.length > 0 && (
            <Card>
              <CardBody className="space-y-2 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-fg-subtle">Start a private chat</p>
                {starters.slice(0, 30).map((s) => (
                  <div key={s.id} className="flex items-center gap-2">
                    <Avatar name={s.full_name} src={s.avatar_url} size={32} />
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm">{s.full_name}</span><span className="text-xs text-fg-subtle">{s.tag}</span></span>
                    <ChatButton memberId={s.id} label="Chat" className="h-8 bg-primary px-3 text-sm text-primary-fg ring-0 hover:bg-primary-hover" />
                  </div>
                ))}
                <p className="text-xs text-fg-subtle">You can also tap Chat on anyone&apos;s page in My Team.</p>
              </CardBody>
            </Card>
          )}
        </aside>
        <section>
          {room ?? (
            <Card><EmptyState icon={<MessageCircle className="size-6" aria-hidden />} title="Pick someone to chat with"
              description="Chat privately with your accountability partner, your sponsor or anyone in your team line."
              action={<Link href="/tools/accountability" className="text-primary">Find an accountability partner</Link>} /></Card>
          )}
        </section>
      </div>
    </>
  );
}
