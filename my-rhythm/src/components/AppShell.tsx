"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import {
  BellRing, BookOpen, CalendarDays, Dumbbell, Flame, History, House, Luggage, Menu, Mic, Music, PanelLeftClose, PanelLeft, Plus,
  Settings, Sparkles, ChartColumn, WifiOff,
} from "lucide-react";
import { PwaClient } from "./PwaClient";
import { Sheet } from "./ui";
import { flushOutbox } from "@/lib/client/outbox";
import { api } from "@/lib/client/api";

const PRIMARY = [
  { href: "/", label: "Today", icon: House },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/reminders", label: "Reminders", icon: BellRing },
];
const GROWTH = [
  { href: "/spiritual", label: "Spiritual", icon: BookOpen },
  { href: "/fitness", label: "Fitness", icon: Dumbbell },
  { href: "/music", label: "Keyboard", icon: Music },
  { href: "/podcast", label: "Podcast", icon: Mic },
  { href: "/habits", label: "Habits", icon: Flame },
];
const PLAN = [
  { href: "/assistant", label: "Ask AI", icon: Sparkles },
  { href: "/travel", label: "Travel", icon: Luggage },
  { href: "/review", label: "Weekly review", icon: ChartColumn },
  { href: "/history", label: "Change history", icon: History },
  { href: "/settings", label: "Settings", icon: Settings },
];

function NavLink({ href, label, icon: Icon, collapsed, onClick }: { href: string; label: string; icon: typeof House; collapsed?: boolean; onClick?: () => void }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path.startsWith(href);
  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={clsx(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium transition",
        active ? "bg-lavender-soft text-ink" : "text-ink-2 hover:bg-surface-2",
        collapsed && "justify-center px-0",
      )}
    >
      <Icon className={clsx("h-5 w-5 shrink-0", active && "text-lavender")} />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [more, setMore] = useState(false);
  const [online, setOnline] = useState(true);
  const path = usePathname();
  const router = useRouter();

  useEffect(() => {
    try { setCollapsed(localStorage.getItem("myrhythm.sidebar") === "1"); } catch {}
    // first-run setup (idempotent): seeds your routine once
    api("/api/bootstrap", { method: "POST" }).catch(() => {});
    const up = () => { setOnline(true); flushOutbox().catch(() => {}); };
    const down = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      try { localStorage.setItem("myrhythm.sidebar", c ? "0" : "1"); } catch {}
      return !c;
    });
  };

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop sidebar */}
      <aside className={clsx("sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-line bg-surface/70 px-3 py-5 backdrop-blur md:flex", collapsed ? "w-[76px]" : "w-64")}>
        <div className={clsx("mb-6 flex items-center", collapsed ? "justify-center" : "justify-between px-2")}>
          {!collapsed && (
            <Link href="/" className="leading-tight">
              <div className="font-display text-xl font-semibold tracking-tight">MY RHYTHM</div>
              <div className="text-[11px] text-muted">Structure Your Days. Build Your Future.</div>
            </Link>
          )}
          <button onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} className="rounded-lg p-2 text-muted hover:bg-surface-2">
            {collapsed ? <PanelLeft className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
        </div>
        <Link href="/add" className={clsx("mb-4 flex items-center justify-center gap-2 rounded-xl bg-navy py-2.5 font-medium text-white dark:bg-lavender dark:text-[#0b1222]", collapsed && "px-0")}>
          <Plus className="h-5 w-5" /> {!collapsed && "Quick Add"}
        </Link>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto scroll-hide">
          {PRIMARY.map((n) => <NavLink key={n.href} {...n} collapsed={collapsed} />)}
          <div className={clsx("mt-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted", collapsed ? "text-center" : "px-3")}>{collapsed ? "·" : "Growth"}</div>
          {GROWTH.map((n) => <NavLink key={n.href} {...n} collapsed={collapsed} />)}
          <div className={clsx("mt-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted", collapsed ? "text-center" : "px-3")}>{collapsed ? "·" : "Plan"}</div>
          {PLAN.map((n) => <NavLink key={n.href} {...n} collapsed={collapsed} />)}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        {!online && (
          <div className="pt-safe sticky top-0 z-30 flex items-center justify-center gap-2 bg-warn-soft px-4 py-2 text-sm text-ink">
            <WifiOff className="h-4 w-4" /> Offline — showing saved data. Check-offs will sync when you reconnect.
          </div>
        )}
        <main className="pt-safe mx-auto w-full max-w-5xl px-4 pt-4 pb-32 md:px-8 md:pt-8 md:pb-12">{children}</main>
      </div>

      {/* Ask AI floating button (every main screen) */}
      {path !== "/assistant" && (
        <button
          onClick={() => router.push("/assistant")}
          className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+88px)] z-30 flex h-12 items-center gap-2 rounded-full bg-gradient-to-br from-lavender to-[#6d62c4] px-4 font-medium text-white shadow-lg md:bottom-6"
          aria-label="Ask AI"
        >
          <Sparkles className="h-5 w-5" /> <span className="hidden sm:inline">Ask AI</span>
        </button>
      )}

      {/* iPhone bottom navigation */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/90 backdrop-blur-xl md:hidden" aria-label="Main">
        <div className="mx-auto grid max-w-md grid-cols-5 items-center px-2 pt-1.5 pb-1">
          {PRIMARY.slice(0, 2).map((n) => <BottomItem key={n.href} {...n} />)}
          <Link href="/add" aria-label="Quick Add" className="mx-auto -mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-navy text-white shadow-lg ring-4 ring-bg dark:bg-lavender dark:text-[#0b1222]">
            <Plus className="h-7 w-7" />
          </Link>
          <BottomItem {...PRIMARY[2]} />
          <button onClick={() => setMore(true)} className="flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium text-muted">
            <Menu className="h-6 w-6" /> More
          </button>
        </div>
      </nav>

      <Sheet open={more} onClose={() => setMore(false)} title="More">
        <div className="grid grid-cols-2 gap-2">
          {[...GROWTH, ...PLAN].map((n) => (
            <Link key={n.href} href={n.href} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-2xl border border-line bg-surface-2/50 px-3 py-3 font-medium">
              <n.icon className="h-5 w-5 text-lavender" /> {n.label}
            </Link>
          ))}
        </div>
      </Sheet>

      <PwaClient />
    </div>
  );
}

function BottomItem({ href, label, icon: Icon }: { href: string; label: string; icon: typeof House }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path.startsWith(href);
  return (
    <Link href={href} className={clsx("flex flex-col items-center gap-0.5 py-1 text-[11px] font-medium", active ? "text-ink" : "text-muted")}>
      <Icon className={clsx("h-6 w-6", active && "text-lavender")} /> {label}
    </Link>
  );
}
