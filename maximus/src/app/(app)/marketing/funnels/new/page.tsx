import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { Wizard } from "./wizard";

export const metadata = { title: "New funnel" };
export const maxDuration = 120;

export default async function NewFunnelPage() {
  const viewer = await requireViewer();
  return (
    <>
      <Link href="/marketing/funnels" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />All funnels</Link>
      <PageHeader eyebrow="Funnels" title="Create a funnel" description="Four quick steps. Your AI designer does the heavy lifting, and you can change anything after." />
      <Wizard userId={viewer.id} />
    </>
  );
}
