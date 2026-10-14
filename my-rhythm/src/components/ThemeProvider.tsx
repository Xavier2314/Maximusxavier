"use client";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

type Theme = "system" | "light" | "dark";
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({ theme: "system", setTheme: () => {} });

function apply(t: Theme) {
  const dark = t === "dark" || (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", dark);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? "#0b1222" : "#fbf8f3");
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("system");
  useEffect(() => {
    const saved = (localStorage.getItem("myrhythm.theme") as Theme) || "system";
    setThemeState(saved);
    apply(saved);
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply((localStorage.getItem("myrhythm.theme") as Theme) || "system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try { localStorage.setItem("myrhythm.theme", t); } catch {}
    apply(t);
  }, []);
  return <Ctx.Provider value={{ theme, setTheme }}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);

/** Inline script that runs before paint to avoid a light/dark flash. */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('myrhythm.theme')||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark')}catch(e){}})();`;
