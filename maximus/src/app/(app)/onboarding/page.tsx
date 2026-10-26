import { CalendarCheck, ClipboardCheck, Bot, Target } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Card, CardBody } from "@/components/ui/card";
import { SubmitButton } from "@/components/ui/submit-button";
import { requireViewer } from "@/lib/auth";
import { env } from "@/lib/env";
import { PushToggle } from "../settings/push-toggle";
import { AvatarUploader } from "../profile/forms";
import { completeOnboardingAction } from "../profile/actions";

export const metadata = { title: "Welcome" };

const steps = [
  { icon: CalendarCheck, title: "Check in at your office", text: "Tap Check in when you arrive. Build a streak." },
  { icon: Target, title: "Set monthly goals", text: "Between the 10th and 15th, plan next month with your sponsor." },
  { icon: ClipboardCheck, title: "Evaluate every five days", text: "1st, 5th, 10th, 15th, 20th, 25th and 30th." },
  { icon: Bot, title: "Ask Maximus AI", text: "Your coach for prospecting, sales and leadership." },
];

export default async function OnboardingPage() {
  const viewer = await requireViewer();
  return (
    <div className="mx-auto max-w-2xl">
      <section className="hero-gradient overflow-hidden rounded-2xl p-8 text-center text-white">
        <Logo variant="mark" className="mx-auto h-14 w-auto" />
        <h1 className="mt-5 text-3xl font-bold tracking-tight">Welcome to Maximus, {viewer.profile.full_name.split(" ")[0]}!</h1>
        <p className="mt-2 text-white/70">Your Member ID is <b className="font-mono text-brand-lime">{viewer.profile.member_id}</b>. Let&apos;s get you set up.</p>
        <div className="mt-6"><AvatarUploader name={viewer.profile.full_name} src={viewer.profile.avatar_url} /></div>
        <p className="mt-2 text-xs text-white/60">Add a profile photo so your team recognises you</p>
      </section>
      <Card className="mt-6">
        <CardBody className="space-y-6">
          <PushToggle vapidKey={env.vapidPublicKey} />
          <ul className="grid gap-4 sm:grid-cols-2">
            {steps.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-primary"><Icon className="size-5" aria-hidden /></span>
                <span><span className="block text-sm font-semibold">{title}</span><span className="text-sm text-fg-muted">{text}</span></span>
              </li>
            ))}
          </ul>
          <form action={completeOnboardingAction}>
            <SubmitButton size="lg" className="w-full" pendingLabel="Loading…">Go to my dashboard</SubmitButton>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
