import { LostIllustration } from "@/components/brand/illustrations";
import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="auth-gradient grid min-h-dvh place-items-center px-6 text-white">
      <div className="text-center">
        <Logo variant="mark" className="mx-auto h-12 w-auto" />
        <LostIllustration className="mx-auto mt-8 w-56" />
        <p className="mt-4 text-sm font-medium tracking-wide text-white/60">Error 404</p>
        <h1 className="mt-1 text-2xl font-semibold">This page doesn&apos;t exist</h1>
        <Link href="/dashboard" className="mt-6 inline-flex h-11 items-center rounded-xl bg-brand-lime px-5 font-medium text-brand-navy">Go to dashboard</Link>
      </div>
    </main>
  );
}
