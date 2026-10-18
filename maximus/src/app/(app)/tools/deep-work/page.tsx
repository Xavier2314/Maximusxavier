import { TimerPage } from "../timer-page";

export const metadata = { title: "Deep work" };

export default function Page({ searchParams }: { searchParams: Promise<{ goal?: string; label?: string }> }) {
  return <TimerPage mode="deep_work" title="Deep work" description="Long, uninterrupted sessions for your most important work. Count interruptions to spot what breaks your focus." searchParams={searchParams} />;
}
