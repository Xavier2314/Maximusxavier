"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { Building2, LogOut, Menu, Network, Search, Settings, User, X } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { brandVars, type Brand } from "@/lib/branding";
import { Avatar } from "@/components/ui/misc";
import { cn } from "@/lib/utils";
import { AnnouncementBar, type BarAnnouncement } from "./announcement-bar";
import { CommandPalette } from "./command-palette";
import { BOTTOM_NAV, isOfficePath, isTeamPath, type NavItem, type NavSection } from "./nav";
import { NAV_ICONS } from "./nav-icons";
import { NotificationBell } from "./notification-bell";
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
        {!compact && <span className={cn("truncate text-base font-semibold tracking-tight", onDark ? "text-white" : "")}>{brand.name}</span>}
      </span>
    );
  }
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-lime font-semibold text-brand-navy">{brand.name.slice(0, 1).toUpperCase()}</span>
      {!compact && <span className={cn("truncate text-lg font-semibold tracking-tight", onDark ? "text-white" : "")}>{brand.name}</span>}
    </span>
  );
}

/** Where the Team / Office views start and what they are called for this member. */
export type TeamView = { home: string; label: string; sections: NavSection[]; bottom: NavItem[] } | null;
export type OfficeView = { home: string; label: string; officeName?: string; sections: NavSection[]; bottom: NavItem[] } | null;

function ViewSwitch({ team, office, mode, dark = false, className }: { team: TeamView; office: OfficeView; mode: "me" | "team" | "office"; dark?: boolean; className?: string }) {
  const base = "flex flex-1 items-center justify-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-medium transition-colors";
  const on = dark ? "bg-white text-brand-navy shadow-sm" : "bg-surface text-fg shadow-sm";
  const off = dark ? "text-white/60 hover:text-white" : "text-fg-muted hover:text-fg";
  return (
    <div role="tablist" aria-label="Switch view"
      className={cn("flex gap-1 rounded-xl p-1", dark ? "bg-white/10 ring-1 ring-white/10" : "bg-surface-muted ring-1 ring-border", className)}>
      <Link href="/dashboard" role="tab" aria-selected={mode === "me"} className={cn(base, mode === "me" ? on : off)}>
        <User className="size-4" aria-hidden />My view
      </Link>
      {team && (
        <Link href={team.home} role="tab" aria-selected={mode === "team"} className={cn(base, mode === "team" ? on : off)}>
          <Network className="size-4" aria-hidden />{team.label}
        </Link>
      )}
      {office && (
        <Link href={office.home} role="tab" aria-selected={mode === "office"} className={cn(base, mode === "office" ? on : off)}>
          <Building2 className="size-4" aria-hidden />{office.label}
        </Link>
      )}
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return ["/dashboard", "/office", "/admin"].includes(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ sections, pathname, onNavigate, dark = false }: { sections: NavSection[]; pathname: string; onNavigate?: () => void; dark?: boolean }) {
  return (
    <nav aria-label="Main" className="space-y-5">
      {sections.map((section, i) => (
        <div key={section.title ?? i}>
          {section.title && <p className={cn("mb-1 px-3 text-xs font-medium", dark ? "text-white/60" : "text-fg-subtle")}>{section.title}</p>}
          <ul className="space-y-0.5">
            {section.items.map((item) => {
              const Icon = NAV_ICONS[item.icon];
              const active = isActive(pathname, item.href);
              return (
                <li key={item.href}>
                  <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex min-h-11 items-center gap-3 rounded-lg px-3 text-[15px] transition-colors lg:min-h-9 lg:text-sm",
                      dark
                        ? active ? "bg-white/10 font-medium text-white" : "text-white/70 hover:bg-white/5 hover:text-white"
                        : active ? "bg-surface-muted font-medium text-fg" : "text-fg-muted hover:bg-surface-muted/70 hover:text-fg",
                    )}>
                    <Icon className={cn("size-4 shrink-0", dark ? (active ? "text-brand-lime" : "text-white/60") : (active ? "text-fg" : "text-fg-subtle group-hover:text-fg-muted"))} aria-hidden />
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

function UserCard({ user, signOut, dark = false }: { user: ShellUser; signOut: () => void; dark?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-lg p-2", dark ? "bg-white/5" : "")}>
      <Link href="/profile" className="flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 hover:opacity-80">
        <Avatar name={user.name} src={user.avatar} size={32} className={dark ? "ring-white/10" : "ring-0"} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-medium", dark ? "text-white" : "text-fg")}>{user.name}</span>
          <span className={cn("block truncate text-xs", dark ? "text-white/60" : "text-fg-subtle")}>{user.role}, {user.memberId}</span>
        </span>
      </Link>
      <form action={signOut}>
        <button type="submit"
          aria-label="Log out" title="Log out"
          className={cn("grid size-11 place-items-center rounded-lg lg:size-9", dark ? "text-white/70 hover:bg-white/10 hover:text-white" : "text-fg-subtle hover:bg-surface-muted hover:text-fg")}>
          <LogOut className="size-4" aria-hidden />
        </button>
      </form>
    </div>
  );
}

export function AppShell({ sections: memberSections, team = null, office = null, brands, platformName, user, unread, signOut, announcements = [], children }: {
  sections: NavSection[]; team?: TeamView; office?: OfficeView; brands: { me: Brand; office: Brand }; platformName: string;
  user: ShellUser; unread: number; signOut: () => void; announcements?: BarAnnouncement[]; children: ReactNode;
}) {
  const pathname = usePathname();
  // /team/[id] (a member's profile) and /messages (a chat) are shared by My Team, Team view and
  // Office view alike, so the path alone can't say which tab you came from. Links into them from a
  // Team/Office context carry ?view=team or ?view=office so the switcher stays on the right tab
  // instead of bouncing to My view.
  const viewParam = useSearchParams().get("view");
  const sharedRoute = pathname.startsWith("/team/") || pathname === "/messages";
  const mode: "me" | "team" | "office" =
    team && (isTeamPath(pathname) || (viewParam === "team" && sharedRoute)) ? "team"
    : office && (isOfficePath(pathname) || (viewParam === "office" && sharedRoute)) ? "office"
    : "me";
  // Office view wears the office's brand; My view and Team view wear the member's own brand (platform, or their office's).
  const brand = mode === "office" ? brands.office : brands.me;
  // Offices that chose their own brand keep their coloured sidebar; the Maximus default is light.
  const darkNav = !brand.isDefault;
  const sections = mode === "team" && team ? team.sections : mode === "office" && office ? office.sections : memberSections;
  const bottom = mode === "team" && team ? team.bottom : mode === "office" && office ? office.bottom : BOTTOM_NAV;
  const allSections = [...memberSections, ...(team?.sections ?? []), ...(office?.sections ?? [])];
  const current = allSections.flatMap((s) => s.items).filter((i) => isActive(pathname, i.href)).sort((a, b) => b.href.length - a.href.length)[0];
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  return (
    <div className="branded min-h-dvh lg:pl-64" style={brandVars(brand) as React.CSSProperties}>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-xl focus:bg-primary focus:px-4 focus:py-2 focus:text-primary-fg">
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-40 hidden w-64 flex-col px-3 pb-3 pt-5 lg:flex", darkNav ? "bg-brand-navy" : "border-r border-border bg-bg")}>
        <Link href="/dashboard" className="px-3"><BrandMark brand={brand} onDark={darkNav} /></Link>
        {brand.tagline && <p className={cn("mt-2 truncate px-3 text-xs", darkNav ? "text-white/60" : "text-fg-subtle")}>{brand.tagline}</p>}
        {(team || office) && <ViewSwitch team={team} office={office} mode={mode} dark={darkNav} className="mt-5" />}
        {mode === "office" && office?.officeName && (
          <p className={cn("mt-3 truncate px-3 text-xs", darkNav ? "text-white/60" : "text-fg-subtle")}>Managing <span className={cn("font-medium", darkNav ? "text-white/80" : "text-fg")}>{office.officeName}</span></p>
        )}
        <div className={cn("scrollbar-none -mx-1 flex-1 overflow-y-auto px-1", (team || office) ? "mt-5" : "mt-6")}>
          <NavLinks sections={sections} pathname={pathname} dark={darkNav} />
        </div>
        <UserCard user={user} signOut={signOut} dark={darkNav} />
        {!brand.isDefault && !brand.whiteLabel && brand.name !== platformName && (
          <p className={cn("mt-3 text-center text-xs", darkNav ? "text-white/60" : "text-fg-subtle")}>Powered by {platformName}</p>
        )}
      </aside>

      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-bg/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <AnnouncementBar items={announcements} />
        {(team || office) && (
          <div className="border-b border-border/60 px-4 py-2 lg:hidden">
            <ViewSwitch team={team} office={office} mode={mode} className="mx-auto max-w-md" />
          </div>
        )}
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-1 px-4 sm:gap-2 sm:px-6">
          <Link href="/dashboard" className="lg:hidden"><BrandMark brand={brand} compact onDark={false} /></Link>
          <p className="hidden min-w-0 truncate text-sm font-medium md:block">{current?.label}</p>
          <button type="button" onClick={() => window.dispatchEvent(new Event("maximus:search"))}
            className="ml-auto flex h-11 min-w-0 items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-fg-subtle transition-colors hover:border-fg-subtle/40 sm:w-64 md:ml-6 lg:h-9"
            aria-label="Search pages and actions">
            <Search className="size-4 shrink-0" aria-hidden />
            <span className="hidden flex-1 truncate text-left sm:inline">Search or jump to…</span>
            <kbd className="hidden rounded border border-border bg-surface-muted px-1.5 font-sans text-xs lg:inline">Ctrl K</kbd>
          </button>
          <div className="flex-1" />
          <QuickAdd />
          <ThemeToggle />
          <NotificationBell userId={user.id} initialUnread={unread} />
          <Link href="/profile" className="hidden size-11 place-items-center sm:grid lg:hidden" aria-label="Your profile">
            <Avatar name={user.name} src={user.avatar} size={36} />
          </Link>
          <Link href="/settings" className="hidden size-9 place-items-center rounded-lg text-fg-muted hover:bg-surface-muted hover:text-fg lg:grid" aria-label="Settings">
            <Settings className="size-5" aria-hidden />
          </Link>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-16 lg:pt-10">{children}</main>
      <CommandPalette sections={allSections} />

      {/* Mobile bottom navigation */}
      <nav aria-label="Quick" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-bg-elevated lg:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {bottom.map((item) => {
            const Icon = NAV_ICONS[item.icon];
            const active = isActive(pathname, item.href);
            const isCheckIn = item.href === "/attendance" || item.href === "/attendance/live";
            return (
              <li key={item.href}>
                <Link href={item.href} aria-current={active ? "page" : undefined}
                  className={cn("flex min-h-14 flex-col items-center justify-end gap-1 pb-2 pt-2 text-xs font-medium", active ? "text-primary" : "text-fg-muted")}>
                  {isCheckIn ? (
                    <span className="-mt-5 grid size-12 place-items-center rounded-xl bg-primary text-primary-fg ring-4 ring-bg-elevated">
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
              className="flex min-h-14 w-full flex-col items-center justify-end gap-1 pb-2 pt-2 text-xs font-medium text-fg-muted">
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
          <div className="safe-bottom absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-2xl bg-bg px-3 pb-6 pt-3 animate-rise">
            <div className="mb-4 flex items-center justify-between px-2">
              <BrandMark brand={brand} onDark={false} />
              <button type="button" onClick={() => setMenuOpen(false)} className="grid size-11 place-items-center rounded-lg text-fg-muted hover:bg-surface-muted" aria-label="Close menu">
                <X className="size-5" aria-hidden />
              </button>
            </div>
            <NavLinks sections={sections} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            <div className="mt-6 space-y-3">
              <Link href="/settings" className="flex min-h-11 items-center gap-3 rounded-lg px-3 text-fg-muted hover:bg-surface-muted">
                <Settings className="size-4 text-fg-subtle" aria-hidden />Settings
              </Link>
              <UserCard user={user} signOut={signOut} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
