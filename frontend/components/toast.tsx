"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "success" | "error";
type Toast = { id: number; tone: ToastTone; message: string };

type ToastContextValue = {
  pushToast: (tone: ToastTone, message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const pushToast = useCallback((tone: ToastTone, message: string) => {
    const id = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id, tone, message }]);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  useEffect(() => {
    if (toasts.length === 0) return;
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dismiss(toast.id), 3800),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [toasts, dismiss]);

  const value = useMemo(() => ({ pushToast }), [pushToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start justify-between gap-3 rounded-xl px-4 py-3 text-sm shadow-lg ring-1 ${
              toast.tone === "success"
                ? "bg-emerald-50 text-emerald-900 ring-emerald-100"
                : "bg-rose-50 text-rose-900 ring-rose-100"
            }`}
            role="status"
          >
            <span>{toast.message}</span>
            <button
              type="button"
              className="shrink-0 text-lg leading-none opacity-60 hover:opacity-100"
              onClick={() => dismiss(toast.id)}
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}
