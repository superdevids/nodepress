import type React from 'react';
import { cn } from './utils.js';

export interface BadgeProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info';
  size?: 'sm' | 'md';
}

const badgeVariants = {
  default: 'bg-wp-primary/10 text-wp-primary border-wp-primary/20',
  success: 'bg-wp-success/10 text-wp-success border-wp-success/20',
  warning: 'bg-wp-warning/10 text-wp-warning border-wp-warning/20',
  error: 'bg-wp-error/10 text-wp-error border-wp-error/20',
  info: 'bg-wp-accent/10 text-wp-accent border-wp-accent/20',
};

const badgeSizes = {
  sm: 'px-1.5 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
};

export function Badge({ children, className, variant = 'default', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium',
        badgeVariants[variant],
        badgeSizes[size],
        className,
      )}
    >
      {children}
    </span>
  );
}
