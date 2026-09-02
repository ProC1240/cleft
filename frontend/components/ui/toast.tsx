"use client";

import { createContext, ReactNode, useCallback, useContext, useMemo, useState } from "react";

type ToastKind = "success" | "error" | "info";
type ToastInput = { title: string; description?: string; kind?: ToastKind };
type ToastItem = ToastInput & { id: number; kind: ToastKind };

const ToastContext = createContext<{ showToast: (input: ToastInput) => void } | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const showToast = useCallback((input: ToastInput) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    const toast: ToastItem = { id, kind: input.kind ?? "info", title: input.title, description: input.description };
    setToasts((prev) => [...prev, toast]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2600);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-3 top-[5.5rem] z-[100] space-y-2 sm:right-4 sm:top-20" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto toast-enter w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border p-3 shadow-soft ${
              toast.kind === "success"
                ? "border-emerald-400/60 bg-[#06261d]"
                : toast.kind === "error"
                  ? "border-red-400/60 bg-[#2a0b11]"
                  : "border-accent/60 bg-surface"
            }`}
          >
            <p className="text-sm font-semibold text-white">{toast.title}</p>
            {toast.description ? <p className="mt-1 text-xs text-slate-200">{toast.description}</p> : null}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }
  return context;
}
