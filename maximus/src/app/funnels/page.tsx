import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Card, CardBody } from "@/components/ui/card";
import { WaitlistForm } from "./waitlist-form";

export const metadata = {
  title: "Funnels done for you",
  description: "Done-for-you sales funnels, launching soon. Join the waitlist for early access.",
};

const PACKAGES = [
  { name: "Starter", points: ["One focused funnel", "Landing page and opt-in", "Email capture setup"] },
  { name: "Growth", points: ["Multi-step funnel", "Offer and checkout pages", "Follow-up email sequence"] },
  { name: "Pro", points: ["Full funnel system", "Upsells and tracking", "Priority support"] },
];

export default function FunnelsPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <Link href="/" aria-label="Maximus home"><Logo className="h-9 w-auto text-fg" /></Link>

      <header className="mt-14 text-center">
        <span className="inline-block rounded-full border border-border px-3 py-1 text-xs text-fg-subtle">Launching soon</span>
        <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">Sales funnels, built for you</h1>
        <p className="mx-auto mt-4 max-w-xl text-lg text-fg-muted">
          We design and launch complete funnels so you can focus on your business. Join the waitlist for early access.
        </p>
        <WaitlistForm />
      </header>

      <section className="mt-16 grid gap-4 sm:grid-cols-3" aria-label="Packages">
        {PACKAGES.map((p) => (
          <Card key={p.name}>
            <CardBody>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-lg font-semibold">{p.name}</h2>
                <span className="rounded-full border border-primary px-2.5 py-0.5 text-xs text-primary">Coming soon</span>
              </div>
              <p className="mt-1 text-sm text-fg-subtle">Pricing announced at launch</p>
              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-fg-muted">
                {p.points.map((x) => <li key={x}>{x}</li>)}
              </ul>
            </CardBody>
          </Card>
        ))}
      </section>

      <p className="mt-10 text-center text-xs text-fg-subtle">Package details are subject to change before launch.</p>
    </main>
  );
}
