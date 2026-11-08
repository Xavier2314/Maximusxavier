import { PeriodView } from "../goals/period-view";

export const metadata = { title: "Daily goals" };

/** Daily goals: what replaced the daily planner. */
export default function DailyGoalsPage() {
  return <PeriodView view="daily" />;
}
