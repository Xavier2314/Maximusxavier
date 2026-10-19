import Link from "next/link";
import { ArrowLeft, Eye, Globe, Lock, Plus } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Badge, PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { PORTFOLIO_COLUMNS, type Portfolio } from "@/lib/portfolio";
import { createClient } from "@/lib/supabase/server";
import { PayOnline } from "../../payments/pay-online";
import { CreatePortfolioForm } from "./portfolio-ui";

export const metadata = { title: "Portfolio website" };
export const maxDuration = 60;

export default async function PortfolioListPage() {
  await requireViewer();
  const supabase = await createClient();
  const [{ data }, { data: canAdd }, { data: price }] = await Promise.all([
    supabase.from("portfolios").select(PORTFOLIO_COLUMNS).order("created_at").returns<Portfolio[]>(),
    supabase.rpc("can_add_portfolio"),
    supabase.from("app_settings").select("value").eq("key", "portfolio_extra_price").maybeSingle(),
  ]);
  const sites = data ?? [];
  const extraPrice = Number((price?.value as { amount?: number } | null)?.amount ?? 500);

  return (
    <>
      <Link href="/tools" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />Tools</Link>
      <PageHeader eyebrow="Freelance tools" title="Portfolio website"
        description="Your own professional website, built automatically from your profile and work. Share the link with clients anywhere." />

      {sites.length === 0 ? (
        <Card className="mx-auto max-w-xl">
          <CardBody className="space-y-4 py-8 text-center">
            <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary-soft text-primary"><Globe className="size-7" aria-hidden /></span>
            <p className="text-xl font-bold">Create your website in one tap</p>
            <p className="text-fg-muted">Maximus AI writes your headline, about section, skills, services and work samples from your profile, your Upwork details and the orders you&apos;ve recorded. You can edit everything after.</p>
            <CreatePortfolioForm first />
          </CardBody>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="min-w-0 space-y-3 lg:col-span-2">
            {sites.map((s) => (
              <Card key={s.id}>
                <CardBody className="flex flex-wrap items-center gap-4">
                  <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary"><Globe className="size-6" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{s.title || s.headline || "My website"}</p>
                    <a href={`/p/${s.slug}`} target="_blank" rel="noopener noreferrer" className="block truncate text-sm text-primary hover:underline">{env.siteUrl.replace(/^https?:\/\//, "")}/p/{s.slug}</a>
                    <p className="mt-1 flex items-center gap-3 text-xs text-fg-subtle">
                      <span className="inline-flex items-center gap-1"><Eye className="size-3.5" aria-hidden />{s.views} views</span>
                      {s.published ? <Badge tone="green">Live</Badge> : <Badge>Hidden</Badge>}
                    </p>
                  </div>
                  <Link href={`/tools/portfolio/${s.id}`} className="inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-fg hover:bg-primary-hover">Edit</Link>
                </CardBody>
              </Card>
            ))}
          </div>
          <Card className="h-fit">
            <CardHeader title="Another website" icon={<Plus className="size-4" />}
              description="A separate site for another niche or service, e.g. one for logo design and one for video editing." />
            <CardBody>
              {canAdd ? <CreatePortfolioForm /> : (
                <div className="space-y-3">
                  <p className="flex items-center gap-2 text-sm font-medium"><Lock className="size-4" aria-hidden />Unlock more websites: ₦{extraPrice.toLocaleString()} one-time</p>
                  <PayOnline purpose="portfolio_extra" fixedAmount={extraPrice} />
                </div>
              )}
            </CardBody>
          </Card>
        </div>
      )}
    </>
  );
}
