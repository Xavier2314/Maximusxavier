"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("mx-theme-v3", next ? "dark" : "light"); } catch { /* private mode */ }
    setDark(next);
  }

  return (
    <button type="button" onClick={toggle} className="grid size-11 place-items-center rounded-lg lg:size-9 text-fg-muted hover:bg-surface-muted hover:text-fg"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
      {dark ? <Sun className="size-5" aria-hidden /> : <Moon className="size-5" aria-hidden />}
    </button>
  );
}

/** The same switch as a full-width row, for the account menu. */
export function ThemeMenuItem({ className }: { className?: string }) {
  const [dark, setDark] = useState<boolean | null>(null);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);
  function toggle() {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("mx-theme-v3", next ? "dark" : "light"); } catch { /* private mode */ }
    setDark(next);
  }
  return (
    <button type="button" role="menuitem" onClick={toggle} className={className}>
      {dark ? <Sun className="size-4 text-fg-subtle" aria-hidden /> : <Moon className="size-4 text-fg-subtle" aria-hidden />}
      {dark ? "Light mode" : "Dark mode"}
    </button>
  );
}
