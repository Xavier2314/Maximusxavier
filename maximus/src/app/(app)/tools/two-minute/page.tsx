import { TimerPage } from "../timer-page";

export const metadata = { title: "2-minute challenge" };

export default function Page({ searchParams }: { searchParams: Promise<{ goal?: string; label?: string }> }) {
  return <TimerPage mode="two_minute" title="2-minute challenge" description="Beat procrastination: do one small task right now in two minutes." searchParams={searchParams} />;
}
