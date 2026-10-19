import type { Metadata } from "next";
import { funnelMetadata, PublicFunnelPage } from "../public-funnel";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  return funnelMetadata((await params).slug);
}

export default async function FunnelLanding({ params }: { params: Promise<{ slug: string }> }) {
  return <PublicFunnelPage slug={(await params).slug} />;
}
