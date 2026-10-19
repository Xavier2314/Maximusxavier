import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { cleanPlan } from "@/lib/ad-plan";
import { cleanProduct } from "@/lib/funnels";
import { createClient } from "@/lib/supabase/server";
import { NewPlanForm } from "./new-plan-form";
import { PlanEditor } from "./plan-editor";

export const metadata = { title: "Ads" };
export const maxDuration = 120;

export default async function FunnelAdsPage({ params, searchParams }: { params: Promise<{ funnelId: string }>; searchParams: Promise<{ plan?: string }> }) {
  const viewer = await requireViewer();
  const { funnelId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(funnelId)) notFound();
  const supabase = await createClient();
  const { data: f } = await supabase.from("funnels").select("id, title, slug, published, product").eq("id", funnelId).maybeSingle();
  if (!f) notFound();
  const product = cleanProduct(f.product);
  const { data: plans } = await supabase.from("funnel_ad_plans").select("id, title, plan, created_at").eq("funnel_id", funnelId).order("created_at", { ascending: false });
  const wanted = (await searchParams).plan;
  const current = plans?.find((p) => p.id === wanted) ?? undefined;
  const parsed = current ? cleanPlan(current.plan) : null;
  const { data: me } = await supabase.from("profiles").select("whatsapp").eq("id", viewer.id).maybeSingle();

  return (
    <>
      <Link href="/marketing/ads" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />Ads</Link>
      <PageHeader eyebrow="Ads" title={product.name || f.title} description="Ads that send people to this funnel." />
      {(plans?.length ?? 0) > 0 && (
        <nav className="mb-5 flex flex-wrap gap-2" aria-label="Ad plans">
          {plans!.map((p) => <Link key={p.id} href={`/marketing/ads/${funnelId}?plan=${p.id}`} className={`rounded-full border px-3 py-1.5 text-sm ${p.id === current?.id ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-muted"}`}>{p.title}</Link>)}
          <Link href={`/marketing/ads/${funnelId}`} className={`rounded-full border px-3 py-1.5 text-sm ${!current ? "border-primary bg-primary-soft text-primary" : "border-border hover:bg-surface-muted"}`}>+ New plan</Link>
        </nav>
      )}
      {current && parsed ? (
        <PlanEditor key={current.id} planId={current.id} funnelId={funnelId} slug={f.slug as string} published={Boolean(f.published)} initial={parsed} hasWhatsapp={Boolean(me?.whatsapp)} />
      ) : (
        <Card>
          <CardHeader title="Plan new ads" />
          <CardBody><NewPlanForm funnelId={funnelId} defaultOffer={product.offer} defaultHealth={false} /></CardBody>
        </Card>
      )}
    </>
  );
}
