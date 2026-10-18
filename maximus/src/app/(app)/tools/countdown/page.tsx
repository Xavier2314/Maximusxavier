import { TimerPage } from "../timer-page";

export const metadata = { title: "Countdown timer" };

export default function Page({ searchParams }: { searchParams: Promise<{ goal?: string; label?: string }> }) {
  return <TimerPage mode="countdown" title="Countdown timer" description="Give a task a time limit and beat the clock." searchParams={searchParams} />;
}
