import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Paperclip } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar, Badge } from "@/components/ui/misc";
import { ReadAloud } from "@/components/voice";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Inbox" };

const OPEN: Record<string, (id: string) => string> = {
  goal: (id) => `/goals/${id}`, evaluation: (id) => `/evaluations/${id}`, order: () => "/orders", payment: () => "/finance",
};

export default async function SharedItemPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  const supabase = await createClient();
  const { data: s } = await supabase.from("shared_items")
    .select("*, sender:profiles!shared_items_sender_id_fkey(id, full_name, avatar_url, member_id)").eq("id", id)
    .maybeSingle<{ id: string; sender_id: string; recipient_id: string; kind: string; item_id: string | null; title: string; body: string; message: string | null;
      attachment_path: string | null; read_at: string | null; created_at: string; relation: string;
      sender: { id: string; full_name: string; avatar_url: string | null; member_id: string } | null }>();
  if (!s) notFound();
  if (s.recipient_id === viewer.id && !s.read_at) {
    await supabase.from("shared_items").update({ read_at: new Date().toISOString() }).eq("id", s.id);
  }
  const open = s.item_id && OPEN[s.kind] ? OPEN[s.kind](s.item_id) : null;
  return (
    <>
      <Link href="/inbox" className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden /> Inbox</Link>
      <Card className="max-w-3xl">
        <CardBody className="space-y-5 sm:p-8">
          <div className="flex items-center gap-3">
            <Avatar name={s.sender?.full_name ?? "?"} src={s.sender?.avatar_url} size={48} />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.sender?.full_name} <span className="font-normal text-fg-subtle">· {s.sender?.member_id}</span></p>
              <p className="text-sm text-fg-muted">Sent to their {s.relation === "sponsor" ? "sponsor" : "team leader"} · {formatDate(s.created_at, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
            </div>
            <Badge tone="blue">{s.kind}</Badge>
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{s.title}</h1>
          {s.message && <blockquote className="rounded-2xl bg-primary-soft/60 px-4 py-3 text-sm">“{s.message}”</blockquote>}
          <div className="whitespace-pre-wrap rounded-2xl border border-border p-4 text-sm leading-relaxed">{s.body}</div>
          <div className="flex flex-wrap gap-2">
            <ReadAloud text={`${s.title}. ${s.message ?? ""} ${s.body}`} />
            {s.attachment_path && (
              <a href={`/api/attachments?path=${encodeURIComponent(s.attachment_path)}`} target="_blank" rel="noreferrer"
                className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-border px-3 text-sm font-medium hover:bg-surface-muted">
                <Paperclip className="size-4" aria-hidden /> View attachment
              </a>
            )}
            {open && <Link href={open} className="inline-flex h-11 items-center rounded-xl bg-primary px-3 text-sm font-medium text-primary-fg">Open the full record</Link>}
          </div>
        </CardBody>
      </Card>
    </>
  );
}
