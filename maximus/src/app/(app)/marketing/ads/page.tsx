import Link from "next/link";
import { ArrowLeft, Megaphone } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { cleanProduct } from "@/lib/funnels";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Ads" };

export default async function AdsPage() {
  await requireViewer();
  const supabase = await createClient();
  const { data: funnels } = await supabase.from("funnels").select("id, title, published, product").order("created_at", { ascending: false });
  const { data: plans } = await supabase.from("funnel_ad_plans").select("funnel_id");
  const count = (fid: string) => (plans ?? []).filter((p) => p.funnel_id === fid).length;

  return (
    <>
      <Link href="/marketing" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />Marketing</Link>
      <PageHeader eyebrow="Marketing" title="Ads" description="Pick a product funnel and let AI plan ads that send people to it: the words, the pictures and videos to make, who to show them to, and a budget. Every ad is checked against Facebook's rules before you use it." />
      {!funnels?.length ? (
        <EmptyState icon={<Megaphone className="size-6" />} title="Create a funnel first" description="Ads send people to a funnel page. Build one for your product, then come back here." action={<LinkButton href="/marketing/funnels/new">Create a funnel</LinkButton>} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {funnels.map((f) => {
            const p = cleanProduct(f.product);
            return (
              <Card key={f.id}>
                <CardBody className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="min-w-0 truncate text-lg font-semibold">{p.name || f.title}</h2>
                    <Badge tone={f.published ? "green" : "neutral"}>{f.published ? "Live" : "Draft"}</Badge>
                  </div>
                  <p className="text-sm text-fg-muted">{count(f.id) ? `${count(f.id)} ad plan${count(f.id) === 1 ? "" : "s"}` : "No ads planned yet"}</p>
                  <LinkButton href={`/marketing/ads/${f.id}`} size="sm"><Megaphone className="size-4" aria-hidden />{count(f.id) ? "Open ads" : "Plan ads"}</LinkButton>
                </CardBody>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
