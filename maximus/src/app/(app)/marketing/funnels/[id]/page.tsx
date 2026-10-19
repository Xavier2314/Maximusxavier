import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireViewer } from "@/lib/auth";
import { cleanPages, cleanProduct, cleanTheme, FUNNEL_COLUMNS, type Funnel } from "@/lib/funnels";
import { createClient } from "@/lib/supabase/server";
import { FunnelEditor } from "./editor";

export const metadata = { title: "Funnel editor" };
export const maxDuration = 120;

export default async function EditFunnelPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("funnels").select(FUNNEL_COLUMNS).eq("id", id).maybeSingle<Funnel>();
  if (!data) notFound();
  const funnel: Funnel = { ...data, product: cleanProduct(data.product), theme: cleanTheme(data.theme), pages: cleanPages(data.pages) };
  return (
    <>
      <Link href="/marketing/funnels" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-fg-muted hover:text-fg"><ArrowLeft className="size-4" aria-hidden />All funnels</Link>
      <FunnelEditor funnel={funnel} userId={viewer.id} />
    </>
  );
}
