import type { Metadata } from "next";
import { funnelMetadata, PublicFunnelPage } from "../../public-funnel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string; page: string }> }): Promise<Metadata> {
  const p = await params;
  return funnelMetadata(p.slug, p.page);
}

export default async function FunnelStep({ params }: { params: Promise<{ slug: string; page: string }> }) {
  const p = await params;
  return <PublicFunnelPage slug={p.slug} pageSlug={p.page} />;
}
