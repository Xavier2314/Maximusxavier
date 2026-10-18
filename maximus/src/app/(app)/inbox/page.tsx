import Link from "next/link";
import { Inbox, Send } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn, formatRelative } from "@/lib/utils";

export const metadata = { title: "Inbox" };

const KIND: Record<string, string> = { goal: "Goals", evaluation: "Evaluation", order: "Order", payment: "Payment", plan: "Plan" };
type Row = { id: string; kind: string; title: string; created_at: string; read_at: string | null; relation: string;
  sender: { full_name: string; avatar_url: string | null } | null; recipient: { full_name: string; avatar_url: string | null } | null };

export default async function InboxPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const viewer = await requireViewer();
  const tab = (await searchParams).tab === "sent" ? "sent" : "received";
  const supabase = await createClient();
  const { data } = await supabase.from("shared_items")
    .select("id, kind, title, created_at, read_at, relation, sender:profiles!shared_items_sender_id_fkey(full_name, avatar_url), recipient:profiles!shared_items_recipient_id_fkey(full_name, avatar_url)")
    .eq(tab === "sent" ? "sender_id" : "recipient_id", viewer.id).order("created_at", { ascending: false }).limit(100).returns<Row[]>();
  const rows = data ?? [];
  return (
    <>
      <PageHeader eyebrow="Inbox" title={tab === "sent" ? "Sent to my leaders" : "Sent to me"}
        description={tab === "sent" ? "Goals, evaluations, orders and plans you sent to your sponsor or team leader." : "Goals, evaluations, orders and plans your team sent you."} />
      <div className="mb-4 flex gap-2">
        {(["received", "sent"] as const).map((t) => (
          <Link key={t} href={`/inbox${t === "sent" ? "?tab=sent" : ""}`}
            className={cn("rounded-full px-4 py-2 text-sm font-medium", tab === t ? "bg-primary text-primary-fg" : "bg-surface-muted text-fg-muted")}>
            {t === "sent" ? "Sent" : "Received"}
          </Link>
        ))}
      </div>
      <Card>
        {rows.length === 0 ? (
          <EmptyState icon={tab === "sent" ? <Send className="size-6" /> : <Inbox className="size-6" />} title="Nothing here yet"
            description={tab === "sent" ? "Use “Send to sponsor / team leader” on your goals, evaluations or orders." : "When your team sends you something, it appears here."} />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const who = tab === "sent" ? r.recipient : r.sender;
              return (
                <li key={r.id}>
                  <Link href={`/inbox/${r.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-surface-muted/60">
                    <Avatar name={who?.full_name ?? "?"} src={who?.avatar_url} size={40} />
                    <span className="min-w-0 flex-1">
                      <span className={cn("block truncate", !r.read_at && tab === "received" ? "font-semibold" : "font-medium")}>{r.title}</span>
                      <span className="text-xs text-fg-subtle">{tab === "sent" ? `To ${who?.full_name} (${r.relation === "sponsor" ? "sponsor" : "team leader"})` : `From ${who?.full_name}`} · {formatRelative(r.created_at)}</span>
                    </span>
                    <Badge tone="blue">{KIND[r.kind] ?? r.kind}</Badge>
                    {!r.read_at && tab === "received" && <span className="size-2.5 rounded-full bg-primary" aria-label="Unread" />}
                    {r.read_at && tab === "sent" && <span className="text-xs text-success">Seen</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
