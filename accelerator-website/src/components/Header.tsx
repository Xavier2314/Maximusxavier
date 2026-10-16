"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { Logo } from "./Logo";
import { nav } from "@/lib/site";

export function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,padding] duration-500 ${scrolled || open ? "bg-navy/95 shadow-[0_10px_30px_-15px_rgba(0,0,0,.6)] backdrop-blur" : "bg-transparent"}`}
      style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
    >
      <div className={`container-x flex items-center justify-between gap-6 transition-[height] duration-500 ${scrolled ? "h-16" : "h-20 md:h-24"}`}>
        <Link href="/" aria-label="Accelerator Community home" className="shrink-0">
          <Logo variant="horizontal-reversed" width={scrolled ? 150 : 176} className="h-auto transition-[width] duration-500" priority />
        </Link>
        <nav aria-label="Main" className="hidden lg:block">
          <ul className="flex items-center gap-9">
            {nav.slice(1).map((n) => (
              <li key={n.href}>
                <Link
                  href={n.href}
                  aria-current={isActive(n.href) ? "page" : undefined}
                  className={`relative py-2 text-[13px] font-semibold uppercase tracking-[0.18em] text-white/85 transition-colors hover:text-white after:absolute after:inset-x-0 after:-bottom-0.5 after:h-0.5 after:origin-left after:bg-red after:transition-transform after:duration-300 ${isActive(n.href) ? "text-white after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"}`}
                >
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/events#tickets" className="btn btn-red hidden min-h-11 px-5 sm:inline-flex">Register</Link>
          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center text-white lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={26} /> : <Menu size={26} />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="h-[calc(100dvh-64px)] overflow-y-auto bg-navy lg:hidden"
          >
            <nav aria-label="Mobile" className="container-x flex flex-col py-8">
              {nav.map((n, i) => (
                <Link
                  key={n.href}
                  href={n.href}
                  className="flex items-baseline justify-between border-b border-white/10 py-5 font-display text-3xl text-white"
                  aria-current={isActive(n.href) ? "page" : undefined}
                >
                  {n.label}
                  <span className="font-sans text-xs tracking-[0.2em] text-red">0{i + 1}</span>
                </Link>
              ))}
              <Link href="/events#tickets" className="btn btn-red mt-8 w-full">Register for Events 2026</Link>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
