import { OfflineIllustration } from "@/components/brand/illustrations";
import { Logo } from "@/components/brand/logo";

export const metadata = { title: "Offline" };

export default function OfflinePage() {
  return (
    <main className="auth-gradient grid min-h-dvh place-items-center px-6 text-white">
      <div className="max-w-sm text-center">
        <Logo variant="mark" className="mx-auto h-16" />
        <OfflineIllustration className="mx-auto mt-8 w-56" />
        <h1 className="mt-4 text-2xl font-semibold">You&apos;re offline</h1>
        <p className="mt-2 text-white/70">
          Maximus needs a connection to load your latest attendance, goals and finances. We&apos;ll be ready as soon as you&apos;re back online.
        </p>
        <a href="/dashboard" className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-lime px-5 font-medium text-brand-navy">
          Try again
        </a>
      </div>
    </main>
  );
}
