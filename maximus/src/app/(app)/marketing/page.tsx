import Link from "next/link";
import { ArrowRight, Filter } from "lucide-react";
import { Card, CardBody } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";

export const metadata = { title: "Marketing" };

const TOOLS = [
  { href: "/marketing/funnels", icon: Filter, title: "Funnels", text: "Design pages that sell your products. Let AI write the first draft, then drag, drop and edit.", soon: false },
];

export default async function MarketingPage() {
  await requireViewer();
  return (
    <>
      <PageHeader eyebrow="Grow" title="Marketing" description="Tools to bring in more customers." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((t) => (
          <Link key={t.href} href={t.href} className="group block">
            <Card className="h-full transition-shadow group-hover:shadow-md">
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <span className="grid size-10 place-items-center rounded-xl bg-primary-soft text-primary"><t.icon className="size-5" aria-hidden /></span>
                  {t.soon && <span className="rounded-full border border-primary px-2.5 py-0.5 text-xs text-primary">Coming soon</span>}
                </div>
                <h2 className="mt-3 text-lg font-semibold">{t.title}</h2>
                <p className="mt-1 text-sm text-fg-muted">{t.text}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary">Open <ArrowRight className="size-4" aria-hidden /></span>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
