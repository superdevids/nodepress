import type React from 'react';
import { cn } from './utils.js';

export interface HeadingProps {
  children: React.ReactNode;
  className?: string;
  level?: 1 | 2 | 3 | 4 | 5 | 6;
}

const headingStyles = {
  1: 'text-4xl font-bold tracking-tight',
  2: 'text-3xl font-semibold tracking-tight',
  3: 'text-2xl font-semibold',
  4: 'text-xl font-medium',
  5: 'text-lg font-medium',
  6: 'text-base font-medium',
};

export function Heading({ children, className, level = 2 }: HeadingProps) {
  const Tag = `h${level}` as React.ElementType;
  return <Tag className={cn(headingStyles[level], className)}>{children}</Tag>;
}

export interface TextProps {
  children: React.ReactNode;
  className?: string;
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl';
  as?: 'p' | 'span' | 'div';
  color?: 'default' | 'muted' | 'primary';
}

const textSizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
};

const textColors = {
  default: 'text-wp-text',
  muted: 'text-wp-text-light',
  primary: 'text-wp-primary',
};

export function Text({
  children,
  className,
  size = 'base',
  as: Tag = 'p',
  color = 'default',
}: TextProps) {
  return <Tag className={cn(textSizes[size], textColors[color], className)}>{children}</Tag>;
}
