import { Heart } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import type { Motivation } from "@/lib/planner";
import { createClient } from "@/lib/supabase/server";
import { WhyCard, WhyForm } from "./why-ui";

export const metadata = { title: "My Why" };

export default async function MyWhyPage() {
  const viewer = await requireViewer();
  const supabase = await createClient();
  const { data } = await supabase.from("motivations").select("*").eq("user_id", viewer.id)
    .order("created_at", { ascending: false }).returns<Motivation[]>();
  const items = data ?? [];
  const paths = items.map((m) => m.image_path).filter(Boolean) as string[];
  const { data: signed } = paths.length ? await supabase.storage.from("motivations").createSignedUrls(paths, 3600) : { data: [] };
  const urlOf = (p: string | null) => (p ? signed?.find((s) => s.path === p)?.signedUrl ?? null : null);

  return (
    <>
      <PageHeader eyebrow="Motivation" title="My Why"
        description="The reasons you do this: your family, your goals, the life you're building. Read them on hard days." />
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Card className="lg:sticky lg:top-24">
            <CardHeader title={items.length ? "Add another reason" : "Write your first reason"} icon={<Heart className="size-4" />}
              description="Private by default. You choose what your sponsor sees." />
            <CardBody><WhyForm /></CardBody>
          </Card>
        </div>
        <div className="space-y-4 lg:col-span-3">
          {items.length === 0 ? (
            <div className="card p-8 text-center">
              <span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary-soft text-primary" aria-hidden><Heart className="size-6" /></span>
              <h2 className="mt-3 text-lg font-semibold">Why did you start?</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-fg-muted">
                Members who write down their why keep going when it gets hard. Start with one line: who are you doing this for?
              </p>
            </div>
          ) : items.map((m) => <WhyCard key={m.id} item={m} imageUrl={urlOf(m.image_path)} editable />)}
        </div>
      </div>
    </>
  );
}
