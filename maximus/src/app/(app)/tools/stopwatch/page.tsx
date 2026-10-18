import { TimerPage } from "../timer-page";

export const metadata = { title: "Stopwatch" };

export default function Page({ searchParams }: { searchParams: Promise<{ goal?: string; label?: string }> }) {
  return <TimerPage mode="stopwatch" title="Stopwatch" description="Track how long a task really takes, with laps." searchParams={searchParams} />;
}
