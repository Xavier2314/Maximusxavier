"use client";
import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import clsx from "clsx";

type Kind = "success" | "error" | "info";
interface Toast { id: number; kind: Kind; message: string; action?: { label: string; run: () => void } }
const Ctx = createContext<{ show: (kind: Kind, message: string, action?: Toast["action"]) => void }>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const show = useCallback((kind: Kind, message: string, action?: Toast["action"]) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t.slice(-2), { id, kind, message, action }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), action ? 8000 : 4000);
  }, []);
  return (
    <Ctx.Provider value={{ show }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={clsx("animate-fade-up pointer-events-auto flex w-full max-w-md items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-lg",
            t.kind === "error" ? "border-danger/30 bg-danger-soft" : "border-line bg-surface")}>
            {t.kind === "success" ? <CircleCheck className="h-5 w-5 shrink-0 text-sage" /> : t.kind === "error" ? <TriangleAlert className="h-5 w-5 shrink-0 text-danger" /> : <Info className="h-5 w-5 shrink-0 text-lavender" />}
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button className="font-semibold text-lavender" onClick={() => { t.action!.run(); setToasts((x) => x.filter((y) => y.id !== t.id)); }}>
                {t.action.label}
              </button>
            )}
            <button aria-label="Dismiss" onClick={() => setToasts((x) => x.filter((y) => y.id !== t.id))} className="text-muted"><X className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export const useToast = () => useContext(Ctx);
