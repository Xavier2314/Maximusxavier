import Link from "next/link";
import { notFound } from "next/navigation";
import { FunnelView } from "@/components/funnels/funnel-view";
import { requireViewer } from "@/lib/auth";
import { cleanPages, cleanProduct, cleanTheme, pagePath } from "@/lib/funnels";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Owner-only preview of a funnel exactly as visitors see it (forms don't send anything). */
export default async function PreviewPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ p?: string }> }) {
  await requireViewer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("funnels").select("title, slug, product, theme, pages").eq("id", id).maybeSingle();
  if (!data) notFound();
  const pages = cleanPages(data.pages);
  const want = (await searchParams).p;
  const idx = Math.max(0, pages.findIndex((p) => p.slug === want));
  const page = pages[idx];
  if (!page) notFound();
  const next = pages[idx + 1];
  const hrefFor = (i: number) => `/builder/${id}/preview?p=${pages[i].slug}`;
  const product = cleanProduct(data.product);
  void product;
  return (
    <>
      <div className="sticky top-0 z-50 flex flex-wrap items-center gap-2 bg-[#111827] px-4 py-2 text-sm text-white">
        <span className="rounded-full bg-[#f59e0b] px-2.5 py-0.5 text-xs font-bold text-black">PREVIEW</span>
        <span className="truncate font-semibold">{data.title}</span>
        <nav className="ml-auto flex flex-wrap gap-1.5" aria-label="Pages">
          {pages.map((p, i) => <Link key={p.id} href={hrefFor(i)} className={`rounded-lg px-2.5 py-1 ${i === idx ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"}`}>{i + 1}. {p.name}</Link>)}
          <Link href={`/builder/${id}`} className="rounded-lg bg-[#4f46e5] px-2.5 py-1 font-semibold">Back to builder</Link>
        </nav>
      </div>
      <FunnelView slug={data.slug} theme={cleanTheme(data.theme)} page={page} preview nextHref={next ? hrefFor(idx + 1) : undefined} />
    </>
  );
}
