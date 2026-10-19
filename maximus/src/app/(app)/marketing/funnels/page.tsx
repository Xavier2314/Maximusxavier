import Link from "next/link";
import { ArrowLeft, Eye, Filter, Inbox, Pencil, Plus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { FUNNEL_COLUMNS, type Funnel } from "@/lib/funnels";
import { createClient } from "@/lib/supabase/server";
import { NewFunnelForm } from "./new-funnel-form";

export const metadata = { title: "Funnels" };
export const maxDuration = 120;

export default async function FunnelsPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("funnels").select(FUNNEL_COLUMNS).order("created_at", { ascending: false }).returns<Funnel[]>();
  const funnels = data ?? [];
  const counts = await Promise.all(funnels.map(async (f) => (await supabase.from("funnel_leads").select("id", { count: "exact", head: true }).eq("funnel_id", f.id)).count ?? 0));

  return (
    <>
      <Link href="/marketing" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />Marketing</Link>
      <PageHeader eyebrow="Marketing" title="Funnels" description="Design pages that sell your products. Let AI build the first draft, then drag, drop and edit anything." />

      {funnels.length > 0 && (
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funnels.map((f, i) => (
            <Card key={f.id}>
              <CardBody className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="min-w-0 truncate text-lg font-semibold">{f.title}</h2>
                  <Badge tone={f.published ? "green" : "neutral"}>{f.published ? "Live" : "Draft"}</Badge>
                </div>
                <p className="flex gap-4 text-sm text-fg-muted">
                  <span className="inline-flex items-center gap-1"><Eye className="size-4" aria-hidden />{f.views} views</span>
                  <span className="inline-flex items-center gap-1"><Inbox className="size-4" aria-hidden />{counts[i]} leads &amp; orders</span>
                </p>
                <div className="flex flex-wrap gap-2">
                  <LinkButton href={`/marketing/funnels/${f.id}`} size="sm"><Pencil className="size-4" aria-hidden />Edit</LinkButton>
                  <LinkButton href={`/marketing/funnels/${f.id}/leads`} size="sm" variant="outline">Leads &amp; orders</LinkButton>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      <Card className="mx-auto max-w-3xl">
        <CardHeader title={funnels.length ? "Create another funnel" : "Create your first funnel"} icon={funnels.length ? <Plus className="size-4" /> : <Filter className="size-4" />}
          description="Tell us about your product. AI writes and lays out the pages; you can change everything after." />
        <CardBody><NewFunnelForm userId={viewer.id} /></CardBody>
      </Card>
    </>
  );
}
