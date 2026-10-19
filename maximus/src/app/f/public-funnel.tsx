import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AdSourceCapture } from "@/components/funnels/funnel-bits";
import { FunnelView } from "@/components/funnels/funnel-view";
import { pagePath } from "@/lib/funnels";
import { countFunnelView, loadPublicFunnel } from "@/lib/funnel-public";

export async function funnelMetadata(slug: string, pageSlug?: string): Promise<Metadata> {
  const f = await loadPublicFunnel(slug);
  if (!f) return { title: "Page not found" };
  const page = pageSlug ? f.pages.find((p) => p.slug === pageSlug) : f.pages[0];
  const hero = page?.blocks.find((b) => b.type === "hero");
  const seo = page?.seo;
  const title = seo?.title || f.title;
  const description = seo?.description || (hero && hero.type === "hero" ? hero.subheadline.slice(0, 160) : undefined);
  const image = seo?.image || f.product.imageUrl;
  // Funnel pages carry the seller's name only: no "Maximus" title suffix, app name or install label.
  return {
    title: { absolute: title },
    applicationName: f.title,
    appleWebApp: { title: f.title },
    description,
    robots: seo?.noIndex ? { index: false, follow: false } : undefined,
    alternates: { canonical: pageSlug ? `/f/${f.slug}/${pageSlug}` : `/f/${f.slug}` },
    openGraph: { title, description, images: image ? [image] : undefined },
  };
}

export async function PublicFunnelPage({ slug, pageSlug }: { slug: string; pageSlug?: string }) {
  const f = await loadPublicFunnel(slug);
  if (!f) notFound();
  const index = pageSlug ? f.pages.findIndex((p) => p.slug === pageSlug) : 0;
  const page = f.pages[index];
  if (!page) notFound();
  if (index === 0) void countFunnelView(slug).then(() => undefined, () => undefined);
  const next = f.pages[index + 1];
  const b = f.product.business;
  const merge = { "business.name": b.name, "business.phone": b.phone, "business.email": b.email, "business.address": b.address, "right_now.year": String(new Date().getFullYear()) };
  return (
    <>
      <AdSourceCapture />
      <FunnelView slug={f.slug} theme={f.theme} page={page} merge={merge} whatsapp={f.whatsapp ?? undefined} nextHref={next ? pagePath(f.slug, next, index + 1) : undefined} />
    </>
  );
}
