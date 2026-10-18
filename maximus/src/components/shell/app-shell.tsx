"use client";

import { PushPrompt } from "@/components/push-prompt";
import { FeaturedPopup, FeaturedSideBox } from "@/components/featured/featured-video";
import type { FeaturedVideo } from "@/lib/featured";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Building2, LogOut, Menu, Search, Settings, User, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { brandVars, type Brand } from "@/lib/branding";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { AnnouncementBar, type BarAnnouncement } from "./announcement-bar";
import { CommandPalette } from "./command-palette";
import { BOTTOM_NAV, OFFICE_BOTTOM_NAV, isOfficePath, type NavItem, type NavSection } from "./nav";
import { NAV_ICONS } from "./nav-icons";
import { NotificationBell } from "./notification-bell";
import { ViewportFix } from "./viewport-fix";
import { QuickAdd } from "./quick-add";
import { ThemeToggle } from "./theme-toggle";

type ShellUser = { id: string; name: string; avatar: string | null; role: string; memberId: string };

/** The brand's logo: the official Maximus logo, an uploaded logo, or the brand name. */
function BrandMark({ brand, compact = false, onDark = true }: { brand: Brand; compact?: boolean; onDark?: boolean }) {
  if (brand.isDefault) return compact ? <Logo variant="mark" className="h-8 w-auto" /> : <Logo className={cn("h-8 w-auto", onDark ? "text-white" : "")} />;
  if (brand.logo) {
    return (
      <span className="flex min-w-0 items-center gap-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={brand.logo} alt={brand.name} className={cn("w-auto object-contain", compact ? "h-8 max-w-[120px]" : "h-9 max-w-[150px]")} />
        {!compact && <span className={cn("truncate text-base font-bold tracking-tight", onDark ? "text-white" : "")}>{brand.name}</span>}
      </span>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-lime font-bold text-brand-navy">{brand.name.slice(0, 1).toUpperCase()}</span>
      {!compact && <span className={cn("truncate text-lg font-bold tracking-tight", onDark ? "text-white" : "")}>{brand.name}</span>}
    </span>
  );
}

/** Where the Office view starts and what it is called for this member. */
export type OfficeView = { home: string; label: string; officeName?: string; sections: NavSection[]; bottom: NavItem[] } | null;

function ViewSwitch({ office, mode, dark = false, className }: { office: NonNullable<OfficeView>; mode: "me" | "office"; dark?: boolean; className?: string }) {
  const base = "flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-medium transition-colors";
  const on = dark ? "bg-white text-brand-navy shadow-sm" : "bg-surface text-fg shadow-sm";
  const off = dark ? "text-white/60 hover:text-white" : "text-fg-muted hover:text-fg";
  return (
    <div role="tablist" aria-label="Switch view"
      className={cn("flex gap-1 rounded-xl p-1", dark ? "bg-white/10 ring-1 ring-white/10" : "bg-surface-muted ring-1 ring-border", className)}>
      <Link href="/dashboard" role="tab" aria-selected={mode === "me"} className={cn(base, mode === "me" ? on : off)}>
        <User className="size-4" aria-hidden />My view
      </Link>
      <Link href={office.home} role="tab" aria-selected={mode === "office"} className={cn(base, mode === "office" ? on : off)}>
        <Building2 className="size-4" aria-hidden />{office.label}
      </Link>
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return ["/dashboard", "/office", "/admin"].includes(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
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
    <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <Link href="/profile" className="flex items-center gap-3">
        <Avatar name={user.name} src={user.avatar} size={38} className="ring-white/10" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white">{user.name}</span>
          <span className="block truncate text-xs text-white/50">{user.role} · {user.memberId}</span>
        </span>
      </Link>
      <form action={signOut} className="mt-3">
        <button type="submit"
          className="flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-white/10 text-sm font-medium text-white/80 hover:bg-white/15 hover:text-white">
          <LogOut className="size-4" aria-hidden />Log out
        </button>
      </form>
    </div>
  );
}

export function AppShell({ sections: memberSections, office = null, brands, platformName, user, unread, signOut, announcements = [], featured = null, children }: {
  sections: NavSection[]; office?: OfficeView; brands: { me: Brand; office: Brand }; platformName: string; featured?: FeaturedVideo | null;
  user: ShellUser; unread: number; signOut: () => void; announcements?: BarAnnouncement[]; children: ReactNode;
}) {
  const pathname = usePathname();
  const mode: "me" | "office" = office && isOfficePath(pathname) ? "office" : "me";
  // Office view wears the office's brand; My view wears the member's own brand (platform, or their office's).
  const brand = mode === "office" ? brands.office : brands.me;
  const sections = mode === "office" && office ? office.sections : memberSections;
  const bottom = mode === "office" && office ? office.bottom : BOTTOM_NAV;
  const allSections = office ? [...memberSections, ...office.sections] : memberSections;
  const current = allSections.flatMap((s) => s.items).filter((i) => isActive(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <div className="branded min-h-dvh lg:pl-72" style={brandVars(brand) as React.CSSProperties}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-white">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-72 flex-col bg-brand-navy px-4 pb-4 pt-6 lg:flex">
        <Link href="/dashboard" className="px-3"><BrandMark brand={brand} /></Link>
        {brand.tagline && <p className="mt-2 truncate px-3 text-xs text-white/50">{brand.tagline}</p>}
        {office && <ViewSwitch office={office} mode={mode} dark className="mt-6" />}
        {mode === "office" && office?.officeName && (
          <p className="mt-3 truncate px-3 text-xs text-white/50">Managing <span className="font-medium text-white/80">{office.officeName}</span></p>
        )}
        <div className={cn("scrollbar-none flex-1 overflow-y-auto", office ? "mt-6" : "mt-8")}>
          <NavLinks sections={sections} pathname={pathname} />
        </div>
        {featured && <FeaturedSideBox video={featured} />}
        <UserCard user={user} signOut={signOut} />
        {!brand.isDefault && !brand.whiteLabel && brand.name !== platformName && (
          <p className="mt-3 text-center text-[11px] text-white/35">Powered by {platformName}</p>
        )}
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/60 bg-bg/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <AnnouncementBar items={announcements} />
        {office && (
          <div className="border-b border-border/60 px-4 py-2 lg:hidden">
            <ViewSwitch office={office} mode={mode} className="mx-auto max-w-md" />
          </div>
        )}
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
          <Link href="/dashboard" className="lg:hidden"><BrandMark brand={brand} compact onDark={false} /></Link>
          <p className="hidden min-w-0 truncate text-sm font-semibold text-fg-muted md:block">{current?.label}</p>
          <button type="button" onClick={() => window.dispatchEvent(new Event("maximus:search"))}
            className="ml-auto flex h-10 min-w-0 items-center gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-fg-subtle hover:border-primary/40 sm:w-64 md:ml-6"
            aria-label="Search pages and actions">
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="hidden flex-1 truncate text-left sm:inline">Search or jump to…</span>
            <kbd className="hidden rounded-md border border-border px-1.5 text-[11px] lg:inline">Ctrl K</kbd>
          </button>
          <div className="flex-1" />
          <QuickAdd />
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

      <main id="main" className="mx-auto max-w-7xl px-4 pb-28 pt-6 sm:px-6 lg:pb-12"><PushPrompt />{children}</main>
      <CommandPalette sections={allSections} />
      <ViewportFix />
      {featured && <FeaturedPopup video={featured} />}

      {/* Mobile bottom navigation */}
      <nav aria-label="Quick" className="bottom-bar safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-bg-elevated/90 backdrop-blur-xl lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {bottom.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            const active = isActive(pathname, item.href);
            const isCheckIn = item.href === "/attendance" || item.href === "/attendance/live";
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
              <BrandMark brand={brand} />
              <button type="button" onClick={() => setMenuOpen(false)} className="grid size-10 place-items-center rounded-xl text-white/70 hover:bg-white/10" aria-label="Close menu">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <NavLinks sections={sections} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            <div className="mt-6 space-y-3">
              <Link href="/settings" className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-white/70 hover:bg-white/5">
                <Settings className="size-[18px]" aria-hidden /> Settings
              </Link>
              {featured && <div onClick={() => setMenuOpen(false)}><FeaturedSideBox video={featured} /></div>}
              <UserCard user={user} signOut={signOut} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
