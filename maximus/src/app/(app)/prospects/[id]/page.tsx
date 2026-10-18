import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, Phone } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { isGoogleConfigured, isSpotifySearchConfigured, isWhatsAppConfigured } from "@/lib/followup";
import { CHANNEL_LABELS, stageLabel, type Prospect, type ProspectMessage } from "@/lib/prospects";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelative } from "@/lib/utils";
import { Autopilot, Conversation, EditProspect } from "./client";

export const metadata = { title: "Prospect" };

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: p } = await supabase.from("prospects").select("*").eq("id", id).maybeSingle<Prospect>();
  if (!p) notFound();
  const [{ data: messages }, { data: integrations }] = await Promise.all([
    supabase.from("prospect_messages").select("*").eq("prospect_id", id).order("created_at").returns<ProspectMessage[]>(),
    supabase.rpc("my_integrations"),
  ]);
  const own = p.owner_id === viewer.id;
  const gmailConnected = ((integrations ?? []) as { provider: string }[]).some((i) => i.provider === "google");
  const canAutoSend = p.channel === "whatsapp" ? isWhatsAppConfigured() && Boolean(p.phone)
    : p.channel === "email" ? isGoogleConfigured() && gmailConnected && Boolean(p.email) : false;

  return (
    <>
      <Link href={own ? "/prospects" : `/prospects?member=${p.owner_id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Prospects
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={p.full_name} size={56} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold tracking-tight">{p.full_name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-fg-muted">
            <Badge tone="blue">{stageLabel(p.stage)}</Badge>
            <span>{CHANNEL_LABELS[p.channel]}</span>
            {p.source && <span>· Met at {p.source}</span>}
            <span>· Added {formatDate(p.created_at, { day: "numeric", month: "short" })}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {p.phone && <a href={`tel:+${p.phone}`} className="grid size-11 place-items-center rounded-xl border border-border hover:bg-surface-muted" aria-label="Call"><Phone className="size-5" /></a>}
          {p.email && <a href={`mailto:${p.email}`} className="grid size-11 place-items-center rounded-xl border border-border hover:bg-surface-muted" aria-label="Email"><Mail className="size-5" /></a>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Conversation prospect={p} messages={messages ?? []} readOnly={!own} canAutoSend={canAutoSend}
            spotifySearch={isSpotifySearchConfigured()} />
        </div>
        <div className="space-y-6">
          {own && (
            <Card>
              <CardHeader title="AI follow-up" description="Maximus AI messages them, reads their replies and answers for you." />
              <CardBody>
                <Autopilot id={p.id} on={p.autopilot} optedOut={p.opted_out} channel={p.channel}
                  ready={canAutoSend} gmailNeeded={p.channel === "email" && !gmailConnected} />
                {p.next_follow_up_at && p.autopilot && (
                  <p className="mt-3 text-sm text-fg-muted">Next follow-up {formatRelative(p.next_follow_up_at)}.</p>
                )}
              </CardBody>
            </Card>
          )}
          {own ? (
            <Card>
              <CardHeader title="Details" />
              <CardBody><EditProspect prospect={p} /></CardBody>
            </Card>
          ) : p.notes && (
            <Card><CardHeader title="Notes" /><CardBody><p className="whitespace-pre-wrap text-sm">{p.notes}</p></CardBody></Card>
          )}
        </div>
      </div>
    </>
  );
}
