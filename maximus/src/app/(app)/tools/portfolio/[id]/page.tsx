import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { PORTFOLIO_COLUMNS, type Portfolio } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/server";
import { PortfolioEditor, ShareSite } from "../portfolio-ui";

export const metadata = { title: "Edit website" };
export const maxDuration = 60;

export default async function PortfolioEditPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  await requireViewer();
  const { id } = await params;
  const { new: isNew } = await searchParams;
  const supabase = await createClient();
  const { data: site } = await supabase.from("portfolios").select(PORTFOLIO_COLUMNS).eq("id", id).maybeSingle<Portfolio>();
  if (!site) notFound();
  const url = `${env.siteUrl}/p/${site.slug}`;
  return (
    <>
      <Link href="/tools/portfolio" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />My websites</Link>
      <PageHeader eyebrow="Portfolio website" title={site.title || "My website"} description={url} />
      {isNew && (
        <p className="mb-4 flex items-center gap-2 rounded-2xl bg-success-soft px-4 py-3 text-sm text-success" role="status">
          <CheckCircle2 className="size-4" aria-hidden />Your website is live! Check it, adjust anything below, then share it.
        </p>
      )}
      <Card className="mb-6"><CardBody><ShareSite url={url} name={site.headline ?? "My portfolio"} /></CardBody></Card>
      <Card><CardBody><PortfolioEditor site={site} /></CardBody></Card>
    </>
  );
}
