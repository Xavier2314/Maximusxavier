import { ArrowLeft } from "lucide-react";
import { LinkButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/misc";
import { requireViewer } from "@/lib/auth";
import { loadTimerData } from "./data";
import { FocusTimer, type TimerMode } from "./focus-timer";

export function BackToTools() {
  return <LinkButton href="/tools" variant="ghost" size="sm"><ArrowLeft className="size-4" aria-hidden /> All tools</LinkButton>;
}

/** Shared server wrapper for every timer tool. */
export async function TimerPage({ mode, title, description, searchParams }: {
  mode: TimerMode; title: string; description: string; searchParams?: Promise<{ goal?: string; label?: string }>;
}) {
  const viewer = await requireViewer();
  const [data, sp] = await Promise.all([loadTimerData(viewer), searchParams ?? Promise.resolve({} as { goal?: string; label?: string })]);
  return (
    <>
      <PageHeader eyebrow="Focus & time" title={title} description={description} action={<BackToTools />} />
      <FocusTimer mode={mode} {...data} initialGoal={sp.goal} initialLabel={sp.label?.slice(0, 140)} />
    </>
  );
}
