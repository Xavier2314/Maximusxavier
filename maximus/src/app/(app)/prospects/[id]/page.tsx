import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Mail, Phone, ShoppingBag, UserPlus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Avatar, Badge } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { isGoogleConfigured, isSpotifySearchConfigured, isWhatsAppConfigured } from "@/lib/followup";
import { CHANNEL_LABELS, stageLabel, type ContactEvent, type Prospect, type ProspectMessage } from "@/lib/prospects";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatRelative } from "@/lib/utils";
import { Autopilot, Conversation, EditProspect } from "./client";
import { TagsEditor } from "./tags-editor";

export const metadata = { title: "Contact" };

export default async function ProspectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data: p } = await supabase.from("prospects").select("*").eq("id", id).maybeSingle<Prospect>();
  if (!p) notFound();
  const [{ data: messages }, { data: integrations }, { data: events }] = await Promise.all([
    supabase.from("prospect_messages").select("*").eq("prospect_id", id).order("created_at").returns<ProspectMessage[]>(),
    supabase.rpc("my_integrations"),
    supabase.from("contact_events").select("id, kind, title, detail, created_at").eq("contact_id", id).order("created_at", { ascending: false }).limit(50).returns<ContactEvent[]>(),
  ]);
  const own = p.owner_id === viewer.id;
  const gmailConnected = ((integrations ?? []) as { provider: string }[]).some((i) => i.provider === "google");
  const canAutoSend = p.channel === "whatsapp" ? isWhatsAppConfigured() && Boolean(p.phone)
    : p.channel === "email" ? isGoogleConfigured() && gmailConnected && Boolean(p.email) : false;

  return (
    <>
      <Link href={own ? "/prospects" : `/prospects?member=${p.owner_id}`} className="mb-4 inline-flex items-center gap-1 text-sm text-fg-muted hover:text-fg">
        <ArrowLeft className="size-4" aria-hidden /> Contacts
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
          <Card>
            <CardHeader title="Activity" description="What this person has done: forms sent, orders placed, surveys answered." />
            <CardBody>
              {(events ?? []).length === 0 ? <p className="text-sm text-fg-muted">Nothing yet. When they send a form, place an order or answer a survey on your pages, it shows up here.</p> : (
                <ol className="space-y-4">
                  {(events ?? []).map((e) => {
                    const answers = (e.detail?.answers && typeof e.detail.answers === "object" ? Object.entries(e.detail.answers as Record<string, unknown>) : []).slice(0, 8);
                    const Icon = e.kind === "funnel_order" ? ShoppingBag : e.kind === "form_response" ? ClipboardList : UserPlus;
                    return (
                      <li key={e.id} className="flex gap-3">
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-primary"><Icon className="size-4" aria-hidden /></span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold">{e.title}</p>
                          <p className="text-xs text-fg-subtle">{formatRelative(e.created_at)}</p>
                          {typeof e.detail?.message === "string" && e.detail.message && <p className="mt-1 whitespace-pre-line text-sm text-fg-muted">{e.detail.message}</p>}
                          {answers.length > 0 && <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">{answers.map(([k, v]) => <div key={k} className="contents"><dt className="text-fg-subtle">{k}</dt><dd className="break-words">{String(v)}</dd></div>)}</dl>}
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardBody>
          </Card>
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
          {own && (
            <Card>
              <CardHeader title="Tags" description="Group people, then filter your list by tag." />
              <CardBody><TagsEditor id={p.id} initial={p.tags ?? []} /></CardBody>
            </Card>
          )}
          {!own && (p.tags ?? []).length > 0 && <Card><CardHeader title="Tags" /><CardBody><div className="flex flex-wrap gap-1.5">{p.tags.map((t) => <span key={t} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs">{t}</span>)}</div></CardBody></Card>}
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
