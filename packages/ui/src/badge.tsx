import type React from "react";
import { cn } from "./utils.js";

export interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "success" | "warning" | "error" | "info";
  size?: "sm" | "md";
}

const badgeVariants = {
  default: "bg-primary/10 text-primary border-primary/20",
  success: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400",
  warning: "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400",
  error: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400",
  info: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400",
};

const badgeSizes = {
  sm: "px-1.5 py-0.5 text-[10px]",
  md: "px-2.5 py-0.5 text-xs",
};

export function Badge({ children, className, variant = "default", size = "sm" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        badgeVariants[variant],
        badgeSizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
