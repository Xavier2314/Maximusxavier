import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { ImportForm } from "./import-form";

export const metadata = { title: "Import HTML" };
export const maxDuration = 120;

export default async function ImportPage() {
  await requireViewer();
  return (
    <>
      <Link href="/marketing/funnels" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />Funnels</Link>
      <PageHeader eyebrow="Funnels" title="Start from your HTML" description="Paste the HTML of a page you already have. We turn it into a funnel you can edit by clicking and dragging." />
      <Card className="max-w-3xl">
        <CardHeader title="Paste your page" />
        <CardBody><ImportForm /></CardBody>
      </Card>
    </>
  );
}
