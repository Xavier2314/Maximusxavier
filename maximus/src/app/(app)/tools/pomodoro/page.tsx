import { TimerPage } from "../timer-page";

export const metadata = { title: "Pomodoro timer" };

export default function Page({ searchParams }: { searchParams: Promise<{ goal?: string; label?: string }> }) {
  return <TimerPage mode="pomodoro" title="Pomodoro timer" description="Work in focused sprints with short breaks. Breaks start automatically." searchParams={searchParams} />;
}
