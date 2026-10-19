import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { deleteLeadAction } from "../../actions";

export const metadata = { title: "Leads & orders" };

type Lead = { id: string; kind: "lead" | "order"; name: string | null; email: string | null; phone: string | null; message: string | null; quantity: number | null; product: string | null; created_at: string };

export default async function LeadsPage({ params }: { params: Promise<{ id: string }> }) {
  await requireViewer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: funnel } = await supabase.from("funnels").select("id, title").eq("id", id).maybeSingle();
  if (!funnel) notFound();
  const { data } = await supabase.from("funnel_leads").select("id, kind, name, email, phone, message, quantity, product, created_at").eq("funnel_id", id).order("created_at", { ascending: false }).limit(500).returns<Lead[]>();
  const leads = data ?? [];
  const when = (d: string) => new Date(d).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" });

  return (
    <>
      <Link href={`/marketing/funnels/${id}`} className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />Back to editor</Link>
      <PageHeader eyebrow={funnel.title} title="Leads & orders" description={`${leads.length} so far. Contact them quickly: the first reply wins the sale.`} />
      {leads.length === 0 ? (
        <Card><CardBody className="py-10 text-center text-fg-muted">Nothing yet. Publish your funnel and share the link. Orders and sign-ups will appear here.</CardBody></Card>
      ) : (
        <div className="space-y-3">
          {leads.map((l) => {
            const wa = l.phone?.replace(/\D/g, "");
            return (
              <Card key={l.id}>
                <CardBody className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="flex flex-wrap items-center gap-2 font-semibold">{l.name}<Badge tone={l.kind === "order" ? "green" : "blue"}>{l.kind === "order" ? "Order" : "Lead"}</Badge></p>
                    {l.kind === "order" && <p className="text-sm">{l.product ?? "Product"} × {l.quantity ?? 1}</p>}
                    <p className="text-sm text-fg-muted">{[l.phone, l.email].filter(Boolean).join(" · ")}</p>
                    {l.message && <p className="whitespace-pre-line text-sm text-fg-muted">{l.message}</p>}
                    <p className="text-xs text-fg-subtle">{when(l.created_at)}</p>
                  </div>
                  <div className="flex gap-2">
                    {wa && wa.length >= 8 && <a href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer" className="inline-flex h-9 items-center rounded-xl bg-success px-3 text-sm font-medium text-white">WhatsApp</a>}
                    {l.phone && <a href={`tel:${l.phone}`} className="inline-flex h-9 items-center rounded-xl border border-border px-3 text-sm font-medium hover:bg-surface-muted">Call</a>}
                    <form action={deleteLeadAction.bind(null, id, l.id)}><Button type="submit" size="icon" variant="ghost" aria-label="Delete"><Trash2 className="size-4" /></Button></form>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
