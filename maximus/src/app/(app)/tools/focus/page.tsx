import { TimerPage } from "../timer-page";

export const metadata = { title: "Focus mode" };

export default function Page({ searchParams }: { searchParams: Promise<{ goal?: string; label?: string }> }) {
  return <TimerPage mode="focus" title="Focus mode" description="A distraction-free full screen with just you and the timer." searchParams={searchParams} />;
}
