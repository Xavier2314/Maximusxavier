"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { LogOut, Menu, Settings, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { BOTTOM_NAV, type NavSection } from "./nav";
import { NAV_ICONS } from "./nav-icons";
import { NotificationBell } from "./notification-bell";
import { ThemeToggle } from "./theme-toggle";

type ShellUser = { id: string; name: string; avatar: string | null; role: string; memberId: string };

function isActive(pathname: string, href: string) {
  return href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ sections, pathname, onNavigate }: { sections: NavSection[]; pathname: string; onNavigate?: () => void }) {
  return (
    <nav aria-label="Main" className="space-y-6">
      {sections.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title && <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/40">{section.title}</p>}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] transition-colors",
                      active ? "bg-white/10 font-medium text-white" : "text-white/65 hover:bg-white/5 hover:text-white",
                    )}>
                    {active && <span className="absolute inset-y-2 left-0 w-1 rounded-r-full bg-brand-lime" aria-hidden />}
                    <Icon className={cn("size-[18px]", active ? "text-brand-lime" : "text-white/50 group-hover:text-white/80")} aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function UserCard({ user, signOut }: { user: ShellUser; signOut: () => void }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <Avatar name={user.name} src={user.avatar} size={38} className="ring-white/10" />
      <Link href="/profile" className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{user.name}</p>
        <p className="truncate text-xs text-white/50">{user.role} · {user.memberId}</p>
      </Link>
      <form action={signOut}>
        <button type="submit" className="grid size-8 place-items-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white" aria-label="Sign out">
          <LogOut className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}

export function AppShell({ sections, user, unread, signOut, children }: {
  sections: NavSection[]; user: ShellUser; unread: number; signOut: () => void; children: ReactNode;
}) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <div className="min-h-dvh lg:pl-72">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-brand-navy px-4 pb-4 pt-6 lg:flex">
        <Link href="/dashboard" className="px-3"><Logo className="h-8 w-auto text-white" /></Link>
        <div className="scrollbar-none mt-8 flex-1 overflow-y-auto">
          <NavLinks sections={sections} pathname={pathname} />
        </div>
        <UserCard user={user} signOut={signOut} />
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="lg:hidden"><Logo variant="mark" className="h-8 w-auto" /></Link>
          <div className="flex-1" />
          <ThemeToggle />
          <NotificationBell userId={user.id} initialUnread={unread} />
          <Link href="/profile" className="hidden sm:block lg:hidden" aria-label="Your profile">
            <Avatar name={user.name} src={user.avatar} size={36} />
          </Link>
          <Link href="/settings" className="hidden size-10 place-items-center rounded-xl text-fg-muted hover:bg-surface-muted hover:text-fg lg:grid" aria-label="Settings">
            <Settings className="size-5" aria-hidden />
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12">{children}</main>

      {/* Mobile bottom navigation */}
      <nav aria-label="Quick" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-bg-elevated/90 backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {BOTTOM_NAV.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            const active = isActive(pathname, item.href);
            const isCheckIn = item.href === "/attendance";
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined}
                  className={cn("flex flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium", active ? "text-primary" : "text-fg-subtle")}>
                  {isCheckIn ? (
                    <span className="-mt-6 grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-brand-blue to-[#1e3a8a] text-white shadow-lg shadow-brand-blue/40 ring-4 ring-bg">
                      <Icon className="size-5" aria-hidden />
                    </span>
                  ) : (
                    <Icon className="size-[22px]" aria-hidden />
                  )}
                  {item.label}
                </Link>
              </li>
            );
          })}
          <li>
            <button type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="mobile-menu"
              className="flex w-full flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-medium text-fg-subtle">
              <Menu className="size-[22px]" aria-hidden />
              More
            </button>
          </li>
        </ul>
      </nav>

      {/* Mobile full menu */}
      {menuOpen && (
        <div id="mobile-menu" role="dialog" aria-modal="true" aria-label="Menu" className="fixed inset-0 z-50 lg:hidden">
          <button type="button" className="absolute inset-0 bg-black/50 animate-fade" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="safe-bottom absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-3xl bg-brand-navy px-4 pb-6 pt-4 animate-rise">
            <div className="mb-4 flex items-center justify-between px-2">
              <Logo className="h-7 w-auto text-white" />
              <button type="button" onClick={() => setMenuOpen(false)} className="grid size-10 place-items-center rounded-xl text-white/70 hover:bg-white/10" aria-label="Close menu">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <NavLinks sections={sections} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            <div className="mt-6 space-y-3">
              <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/70 hover:bg-white/5">
                <Settings className="size-[18px]" aria-hidden /> Settings
              </Link>
              <UserCard user={user} signOut={signOut} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
