import { Filter } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { FUNNEL_PACKAGES } from "@/components/funnels/packages";
import { WaitlistForm } from "@/components/funnels/waitlist-form";
import { LinkButton } from "@/components/ui/button";
import { requireViewer } from "@/lib/auth";

export const metadata = { title: "Funnels" };

export default async function FunnelsPage() {
  const viewer = await requireViewer();
  return (
    <>
      <PageHeader eyebrow="Marketing" title="Funnels" description="Done-for-you sales funnels. Coming soon."
        action={<><LinkButton href="/marketing" variant="ghost" size="sm">All marketing</LinkButton><LinkButton href="/funnels" variant="outline" size="sm">Public page to share</LinkButton></>} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-3 lg:col-span-2">
          {FUNNEL_PACKAGES.map((p) => (
            <Card key={p.name}>
              <CardBody>
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-lg font-semibold">{p.name}</h2>
                  <span className="rounded-full border border-primary px-2.5 py-0.5 text-xs text-primary">Coming soon</span>
                </div>
                <p className="mt-1 text-sm text-fg-subtle">Pricing announced at launch</p>
                <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
                  {p.points.map((x) => <li key={x}>{x}</li>)}
                </ul>
              </CardBody>
            </Card>
          ))}
        </div>

        <Card className="h-fit">
          <CardHeader title="Join the waitlist" icon={<Filter className="size-4" />} description="Be first to get your funnel when packages open." />
          <CardBody>
            <WaitlistForm defaultName={viewer.profile.full_name ?? undefined} defaultEmail={viewer.email} />
            <p className="mt-4 text-xs text-fg-subtle">Package details are subject to change before launch.</p>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
