import { notFound } from "next/navigation";
import { requireViewer } from "@/lib/auth";
import { cleanPages, cleanProduct, cleanTheme, FUNNEL_COLUMNS, type Funnel } from "@/lib/funnels";
import { createClient } from "@/lib/supabase/server";
import { Builder } from "./builder";

export const maxDuration = 120;

export default async function BuilderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ new?: string }> }) {
  const viewer = await requireViewer();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data } = await supabase.from("funnels").select(FUNNEL_COLUMNS).eq("id", id).maybeSingle<Funnel>();
  if (!data) notFound();
  const funnel: Funnel = { ...data, product: cleanProduct(data.product), theme: cleanTheme(data.theme), pages: cleanPages(data.pages) };
  return <Builder funnel={funnel} userId={viewer.id} isNew={(await searchParams).new === "1"} />;
}
