"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Building2, Check, ChevronDown, ChevronsUpDown, LogOut, Menu, Network, Search, Settings, User, X } from "lucide-react";
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

type ViewMode = "me" | "team" | "office";

/** Workspace-style switcher between My view, Team view and Office view. */
function ViewMenu({ team, office, mode, dark = false, onNavigate, className }: {
  team: TeamView; office: OfficeView; mode: ViewMode; dark?: boolean; onNavigate?: () => void; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  const views = [
    { key: "me" as const, href: "/dashboard", label: "My view", hint: "Your own work", Icon: User },
    ...(team ? [{ key: "team" as const, href: team.home, label: team.label, hint: "The people you lead", Icon: Network }] : []),
    ...(office ? [{ key: "office" as const, href: office.home, label: office.label, hint: office.officeName ?? "Your office", Icon: Building2 }] : []),
  ];
  const current = views.find((v) => v.key === mode) ?? views[0];

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors",
          dark ? "border-white/15 text-white hover:bg-white/5" : "border-border bg-surface hover:bg-surface-muted/70")}>
        <current.Icon className={cn("size-4 shrink-0", dark ? "text-white/70" : "text-fg-subtle")} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{current.label}</span>
          <span className={cn("block truncate text-xs", dark ? "text-white/60" : "text-fg-subtle")}>{current.hint}</span>
        </span>
        <ChevronsUpDown className={cn("size-4 shrink-0", dark ? "text-white/60" : "text-fg-subtle")} aria-hidden />
      </button>
      {open && (
        <div role="menu" aria-label="Switch view" className="absolute inset-x-0 top-full z-50 mt-1 rounded-lg border border-border bg-surface p-1 text-fg shadow-lg animate-fade">
          {views.map((v) => (
            <Link key={v.key} href={v.href} role="menuitemradio" aria-checked={v.key === mode}
              onClick={() => { setOpen(false); onNavigate?.(); }}
              className="flex min-h-11 items-center gap-3 rounded-md px-2.5 py-2 hover:bg-surface-muted">
              <v.Icon className="size-4 shrink-0 text-fg-subtle" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{v.label}</span>
                <span className="block truncate text-xs text-fg-subtle">{v.hint}</span>
              </span>
              {v.key === mode && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function isActive(pathname: string, href: string) {
  return ["/dashboard", "/office", "/admin"].includes(href) ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Grouped navigation. Titled categories start closed and open like an accordion: opening one
 * closes the others. The category holding the current page opens by itself.
 */
function NavLinks({ sections, pathname, onNavigate, dark = false }: { sections: NavSection[]; pathname: string; onNavigate?: () => void; dark?: boolean }) {
  const activeTitle = sections.find((sec) => sec.title && sec.items.some((item) => isActive(pathname, item.href)))?.title ?? null;
  const [openTitle, setOpenTitle] = useState<string | null>(activeTitle);
  useEffect(() => { if (activeTitle) setOpenTitle(activeTitle); }, [activeTitle]);

  const row = "flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-[15px] transition-colors lg:min-h-9 lg:text-sm";
  const idle = dark ? "text-white/80 hover:bg-white/5 hover:text-white" : "text-fg-muted hover:bg-surface-muted/70 hover:text-fg";

  const links = (items: NavSection["items"], nested: boolean) => items.map((item) => {
    const Icon = NAV_ICONS[item.icon];
    const active = isActive(pathname, item.href);
    return (
      <li key={item.href}>
        <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined}
          className={cn("group", row, nested && "pl-10",
            active ? (dark ? "bg-white/10 font-medium text-white" : "bg-surface-muted font-medium text-fg") : idle)}>
          {!nested && <Icon className={cn("size-4 shrink-0", dark ? (active ? "text-brand-lime" : "text-white/60") : (active ? "text-fg" : "text-fg-subtle group-hover:text-fg-muted"))} aria-hidden />}
          {item.label}
        </Link>
      </li>
    );
  });

  return (
    <nav aria-label="Main" className="space-y-1">
      {sections.map((section, i) => {
        if (!section.title) return <ul key={`top-${i}`} className="space-y-0.5 pb-2">{links(section.items, false)}</ul>;
        const title = section.title;
        const open = openTitle === title;
        const listId = `nav-${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
        const holdsActive = activeTitle === title;
        return (
          <div key={title}>
            <button type="button" onClick={() => setOpenTitle(open ? null : title)} aria-expanded={open} aria-controls={listId}
              className={cn(row, "justify-between font-medium",
                holdsActive || open ? (dark ? "text-white" : "text-fg") : (dark ? "text-white/80 hover:bg-white/5 hover:text-white" : "text-fg hover:bg-surface-muted/70"))}>
              {title}
              <ChevronDown className={cn("size-4 shrink-0 transition-transform duration-200", dark ? "text-white/60" : "text-fg-subtle", !open && "-rotate-90")} aria-hidden />
            </button>
            {open && <ul id={listId} className="space-y-0.5 pb-1 animate-fade">{links(section.items, true)}</ul>}
          </div>
        );
      })}
    </nav>
  );
}

/** The member's name and photo; opens an account menu with Profile, Settings and Log out. */
function UserCard({ user, signOut, dark = false, onNavigate }: { user: ShellUser; signOut: () => void; dark?: boolean; onNavigate?: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);
  const item = "flex min-h-11 w-full items-center gap-3 rounded-md px-2.5 text-sm hover:bg-surface-muted lg:min-h-9";
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-haspopup="menu" aria-expanded={open}
        className={cn("flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors", dark ? "hover:bg-white/5" : "hover:bg-surface-muted/70")}>
        <Avatar name={user.name} src={user.avatar} size={32} className={dark ? "ring-white/10" : "ring-0"} />
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-sm font-medium", dark ? "text-white" : "text-fg")}>{user.name}</span>
          <span className={cn("block truncate text-xs", dark ? "text-white/60" : "text-fg-subtle")}>{user.role}</span>
        </span>
        <ChevronsUpDown className={cn("size-4 shrink-0", dark ? "text-white/60" : "text-fg-subtle")} aria-hidden />
      </button>
      {open && (
        <div role="menu" aria-label="Account" className="absolute inset-x-0 bottom-full z-50 mb-1 rounded-lg border border-border bg-surface p-1 text-fg shadow-lg animate-fade">
          <p className="truncate px-2.5 pb-1.5 pt-1 text-xs text-fg-subtle">Member {user.memberId}</p>
          <Link href="/profile" role="menuitem" onClick={() => { setOpen(false); onNavigate?.(); }} className={item}>
            <User className="size-4 text-fg-subtle" aria-hidden />Profile
          </Link>
          <Link href="/settings" role="menuitem" onClick={() => { setOpen(false); onNavigate?.(); }} className={item}>
            <Settings className="size-4 text-fg-subtle" aria-hidden />Settings
          </Link>
          <div className="my-1 border-t border-border" />
          <form action={signOut}>
            <button type="submit" role="menuitem" className={item}>
              <LogOut className="size-4 text-fg-subtle" aria-hidden />Log out
            </button>
          </form>
        </div>
      )}
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
  const mode: ViewMode =
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
        {(team || office) && <ViewMenu team={team} office={office} mode={mode} dark={darkNav} className="mt-5" />}
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
            {(team || office) && <ViewMenu team={team} office={office} mode={mode} onNavigate={() => setMenuOpen(false)} className="mb-5" />}
            <NavLinks sections={sections} pathname={pathname} onNavigate={() => setMenuOpen(false)} />
            <div className="mt-6 space-y-3">
              <UserCard user={user} signOut={signOut} onNavigate={() => setMenuOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
