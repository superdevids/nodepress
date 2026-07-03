"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useRef } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ToastType = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => string;
  removeToast: (id: string) => void;
  success: (title: string, description?: string) => string;
  error: (title: string, description?: string) => string;
  warning: (title: string, description?: string) => string;
  info: (title: string, description?: string) => string;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colorMap = {
  success: "border-l-green-500 bg-green-50 dark:bg-green-950",
  error: "border-l-red-500 bg-red-50 dark:bg-red-950",
  warning: "border-l-amber-500 bg-amber-50 dark:bg-amber-950",
  info: "border-l-blue-500 bg-blue-50 dark:bg-blue-950",
};

const iconColorMap = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-blue-600 dark:text-blue-400",
};

let toastCounter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    const timer = timerRefs.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timerRefs.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (toast: Omit<Toast, "id">) => {
      const id = `toast_${++toastCounter}`;
      setToasts((prev) => [...prev, { ...toast, id }]);

      const duration = toast.duration ?? 5000;
      if (duration > 0) {
        const timer = setTimeout(() => removeToast(id), duration);
        timerRefs.current.set(id, timer);
      }

      return id;
    },
    [removeToast],
  );

  const success = useCallback(
    (title: string, description?: string) => addToast({ type: "success", title, description }),
    [addToast],
  );

  const error = useCallback(
    (title: string, description?: string) => addToast({ type: "error", title, description }),
    [addToast],
  );

  const warning = useCallback(
    (title: string, description?: string) => addToast({ type: "warning", title, description }),
    [addToast],
  );

  const info = useCallback(
    (title: string, description?: string) => addToast({ type: "info", title, description }),
    [addToast],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast, success, error, warning, info }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((toast) => {
          const Icon = iconMap[toast.type];
          return (
            <div
              key={toast.id}
              className={cn(
                "flex items-start gap-3 rounded-md border-l-4 p-4 shadow-lg animate-slide-in-from-top",
                colorMap[toast.type],
              )}
            >
              <Icon className={cn("h-5 w-5 mt-0.5 shrink-0", iconColorMap[toast.type])} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{toast.title}</p>
                {toast.description && (
                  <p className="text-sm text-muted-foreground mt-1">{toast.description}</p>
                )}
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
