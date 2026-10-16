import Link from "next/link";
import { Facets } from "@/components/Facets";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <main className="grain relative isolate flex min-h-[100svh] items-center overflow-hidden bg-navy text-white">
      <Facets side="right" className="pointer-events-none absolute -right-6 top-10 -z-10 h-[520px] w-auto" />
      <div className="container-x">
        <Link href="/" aria-label="Home"><Logo variant="horizontal-reversed" width={180} /></Link>
        <p className="eyebrow mt-16">Error 404</p>
        <h1 className="display-xl mt-6 max-w-3xl">This page took a different journey.</h1>
        <p className="lead mt-6 max-w-xl text-mist">The page you are looking for does not exist or has moved.</p>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/" className="btn btn-red">Go home</Link>
          <Link href="/events" className="btn btn-ghost-light">Events 2026</Link>
        </div>
      </div>
    </main>
  );
}
