'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@nodepressjs/ui';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="border-wp-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="text-wp-primary hover:text-wp-primary-hover text-xl font-bold tracking-tight transition-colors"
        >
          NodePress
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-wp-primary/10 text-wp-primary'
                    : 'text-wp-text-light hover:bg-wp-hover-bg hover:text-wp-text',
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
