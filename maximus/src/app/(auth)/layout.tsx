import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { ProductPreview } from "@/components/brand/product-preview";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-bg lg:grid lg:grid-cols-[1fr_1.1fr]">
      <main className="flex min-h-dvh flex-col px-5 pb-10 pt-[max(1.5rem,env(safe-area-inset-top))] sm:px-10">
        <Link href="/" className="self-start"><Logo className="h-8 w-auto text-fg" /></Link>
        <div className="flex flex-1 items-start justify-center pt-10 lg:items-center lg:pt-0">
          <div className="w-full max-w-md">{children}</div>
        </div>
        <p className="text-center text-sm text-fg-subtle lg:text-left">© {new Date().getFullYear()} Maximus</p>
      </main>
      <aside className="relative hidden overflow-hidden border-l border-border bg-surface-muted lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="max-w-md">
          <h2 className="text-[28px] font-semibold leading-tight tracking-[-0.02em]">Your team&apos;s working day, in one place</h2>
          <p className="mt-3 text-fg-muted">Check in at the office, work through today&apos;s list, and see how close you are to this month&apos;s goals.</p>
        </div>
        <ProductPreview className="mt-10 w-full max-w-md" />
      </aside>
    </div>
  );
}
