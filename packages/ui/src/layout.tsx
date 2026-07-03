import type React from "react";
import { cn } from "./utils.js";

export interface BoxProps {
  children: React.ReactNode;
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

export function Box({ children, className, as: Tag = "div" }: BoxProps) {
  const Component = Tag as React.ElementType;
  return <Component className={className}>{children}</Component>;
}

export interface StackProps {
  children: React.ReactNode;
  className?: string;
  direction?: "row" | "column";
  gap?: number;
  align?: "start" | "center" | "end" | "stretch";
  justify?: "start" | "center" | "end" | "between" | "around";
}

const gapMap: Record<number, string> = { 2: 'gap-2', 4: 'gap-4', 6: 'gap-6', 8: 'gap-8' };
const alignMap: Record<string, string> = { start: 'items-start', center: 'items-center', end: 'items-end', stretch: 'items-stretch' };
const justifyMap: Record<string, string> = { start: 'justify-start', center: 'justify-center', end: 'justify-end', between: 'justify-between', around: 'justify-around' };

export function Stack({
  children,
  className,
  direction = "column",
  gap = 4,
  align,
  justify,
}: StackProps) {
  return (
    <div
      className={cn(
        "flex",
        direction === "column" ? "flex-col" : "flex-row",
        gapMap[gap],
        align && alignMap[align],
        justify && justifyMap[justify],
        className,
      )}
    >
      {children}
    </div>
  );
}

export interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}

const containerSizes = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-7xl",
  xl: "max-w-screen-2xl",
  full: "max-w-full",
};

export function Container({ children, className, size = "lg" }: ContainerProps) {
  return (
    <div className={cn("mx-auto px-4 sm:px-6 lg:px-8", containerSizes[size], className)}>
      {children}
    </div>
  );
}

export interface GridProps {
  children: React.ReactNode;
  className?: string;
  cols?: number;
  gap?: number;
}

const gridColsMap: Record<number, string> = { 1: 'lg:grid-cols-1', 2: 'lg:grid-cols-2', 3: 'lg:grid-cols-3', 4: 'lg:grid-cols-4', 5: 'lg:grid-cols-5', 6: 'lg:grid-cols-6' };

export function Grid({ children, className, cols = 3, gap = 4 }: GridProps) {
  return (
    <div
      className={cn(
        "grid",
        "grid-cols-1 sm:grid-cols-2",
        gridColsMap[cols],
        gapMap[gap],
        className,
      )}
    >
      {children}
    </div>
  );
}
