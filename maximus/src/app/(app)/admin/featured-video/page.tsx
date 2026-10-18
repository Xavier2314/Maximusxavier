import { redirect } from "next/navigation";
import { PlayCircle } from "lucide-react";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { PageHeader } from "@/components/ui/misc";
import { FeaturedHomeCard } from "@/components/featured/featured-video";
import { requireViewer } from "@/lib/auth";
import { featuredFrom } from "@/lib/featured";
import { createClient } from "@/lib/supabase/server";
import { FeaturedVideoForm } from "./form";

export const metadata = { title: "Featured video" };

export default async function FeaturedVideoPage() {
  const viewer = await requireViewer();
  if (!viewer.roles.includes("super_admin")) redirect("/forbidden");
  const supabase = await createClient();
  const { data } = await supabase.from("app_settings").select("value").eq("key", "featured_video").maybeSingle();
  const current = featuredFrom(data?.value);
  return (
    <>
      <PageHeader eyebrow="Administration" title="Featured video"
        description="Paste a YouTube link and it shows for every member: a video box on Home, a box in the side menu, and an optional pop-up." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader title={current ? "Change the video" : "Feature a video"} icon={<PlayCircle className="size-4" />} />
          <CardBody><FeaturedVideoForm current={current} /></CardBody>
        </Card>
        <div className="min-w-0">
          <p className="mb-2 text-sm font-semibold text-fg-muted">What members see on Home</p>
          {current ? <FeaturedHomeCard video={current} /> : <p className="text-sm text-fg-muted">No video is featured right now.</p>}
        </div>
      </div>
    </>
  );
}
