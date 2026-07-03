"use client";

import * as React from "react";
import { createContext, useContext, useState, useCallback, useEffect, useRef } from "react";
import { X, CheckCircle, AlertCircle, AlertTriangle, Info, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type NoticeType = "success" | "error" | "warning" | "info";

export interface NoticeAction {
  label: string;
  onClick: () => void;
  variant?: "default" | "outline" | "ghost";
}

export interface AdminNotice {
  id: string;
  type: NoticeType;
  message: string;
  description?: string;
  dismissible?: boolean;
  persistent?: boolean;
  timed?: boolean;
  duration?: number;
  actions?: NoticeAction[];
}

interface NoticeContextType {
  notices: AdminNotice[];
  addNotice: (notice: Omit<AdminNotice, "id">) => string;
  removeNotice: (id: string) => void;
  clearNotices: () => void;
  adminNotice: (opts: {
    type: NoticeType;
    message: string;
    description?: string;
    dismissible?: boolean;
    persistent?: boolean;
    timed?: boolean;
    duration?: number;
    actions?: NoticeAction[];
  }) => string;
}

const NoticeContext = createContext<NoticeContextType | undefined>(undefined);

let noticeCounter = 0;

const noticeStyles: Record<NoticeType, string> = {
  success:
    "border-green-500 bg-green-50 dark:bg-green-950 text-green-800 dark:text-green-200",
  error: "border-red-500 bg-red-50 dark:bg-red-950 text-red-800 dark:text-red-200",
  warning:
    "border-amber-500 bg-amber-50 dark:bg-amber-950 text-amber-800 dark:text-amber-200",
  info: "border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-800 dark:text-blue-200",
};

const iconMap = {
  success: CheckCircle,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const iconColors: Record<NoticeType, string> = {
  success: "text-green-600 dark:text-green-400",
  error: "text-red-600 dark:text-red-400",
  warning: "text-amber-600 dark:text-amber-400",
  info: "text-blue-600 dark:text-blue-400",
};

export function NoticeProvider({ children }: { children: React.ReactNode }) {
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeNotice = useCallback((id: string) => {
    setNotices((prev) => prev.filter((n) => n.id !== id));
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
  }, []);

  const addNotice = useCallback(
    (notice: Omit<AdminNotice, "id">) => {
      const id = `notice_${++noticeCounter}`;
      const fullNotice: AdminNotice = {
        ...notice,
        dismissible: notice.dismissible ?? true,
        persistent: notice.persistent ?? false,
        timed: notice.timed ?? false,
        duration: notice.timed ? notice.duration ?? 5000 : undefined,
        id,
      };
      setNotices((prev) => [...prev, fullNotice]);

      if (fullNotice.timed && fullNotice.duration) {
        const timer = setTimeout(() => removeNotice(id), fullNotice.duration);
        timersRef.current.set(id, timer);
      }

      return id;
    },
    [removeNotice],
  );

  const clearNotices = useCallback(() => {
    timersRef.current.forEach((timer) => clearTimeout(timer));
    timersRef.current.clear();
    setNotices([]);
  }, []);

  const adminNotice = useCallback(
    (opts: {
      type: NoticeType;
      message: string;
      description?: string;
      dismissible?: boolean;
      persistent?: boolean;
      timed?: boolean;
      duration?: number;
      actions?: NoticeAction[];
    }) => addNotice(opts),
    [addNotice],
  );

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
    };
  }, []);

  return (
    <NoticeContext.Provider
      value={{ notices, addNotice, removeNotice, clearNotices, adminNotice }}
    >
      {notices.length > 0 && (
        <div className="space-y-2 px-6 pt-4" role="alert" aria-live="polite">
          {notices.map((notice) => {
            const Icon = iconMap[notice.type];
            return (
              <div
                key={notice.id}
                className={cn(
                  "relative flex items-start gap-3 rounded-md border-l-4 p-4 shadow-sm",
                  "animate-in slide-in-from-top-2 fade-in duration-200",
                  noticeStyles[notice.type],
                )}
              >
                <Icon
                  className={cn("h-5 w-5 mt-0.5 shrink-0", iconColors[notice.type])}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{notice.message}</p>
                  {notice.description && (
                    <p className="text-xs mt-0.5 opacity-80">{notice.description}</p>
                  )}
                  {notice.actions && notice.actions.length > 0 && (
                    <div className="flex gap-2 mt-2">
                      {notice.actions.map((action, i) => (
                        <Button
                          key={i}
                          variant={action.variant ?? "outline"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={action.onClick}
                        >
                          {action.label}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
                {(notice.dismissible !== false || notice.persistent) && (
                  <button
                    onClick={() => removeNotice(notice.id)}
                    className={cn(
                      "shrink-0 rounded-md p-1 transition-colors",
                      "hover:bg-black/10 dark:hover:bg-white/10",
                    )}
                    aria-label="Dismiss notice"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {children}
    </NoticeContext.Provider>
  );
}

export function useNotices() {
  const context = useContext(NoticeContext);
  if (!context) {
    throw new Error("useNotices must be used within a NoticeProvider");
  }
  return context;
}
