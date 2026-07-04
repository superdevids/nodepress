'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';

interface NavTab {
  label: string;
  href: string;
  count?: number;
  exact?: boolean;
}

export default function ContentLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const tabs: NavTab[] = [
    {
      label: 'All Posts',
      href: '/admin/content',
      exact: true,
    },
    {
      label: 'All Pages',
      href: '/admin/content?type=page',
    },
    {
      label: 'Categories',
      href: '/admin/content/categories',
      exact: true,
    },
    {
      label: 'Tags',
      href: '/admin/content/tags',
      exact: true,
    },
  ];

  const isActive = (tab: NavTab) => {
    if (tab.exact) {
      return pathname === tab.href;
    }
    if (tab.href.includes('?type=page')) {
      return pathname === '/admin/content' && searchParams.get('type') === 'page';
    }
    return pathname.startsWith(tab.href);
  };

  // Determine page title based on current route
  const getPageTitle = () => {
    if (pathname === '/admin/content' && !searchParams.get('type')) {
      return 'Posts';
    }
    if (pathname === '/admin/content' && searchParams.get('type') === 'page') {
      return 'Pages';
    }
    if (pathname.includes('/categories')) return 'Categories';
    if (pathname.includes('/tags')) return 'Tags';
    if (pathname.includes('/new')) return 'Add New';
    if (pathname.match(/\/content\/(post|page)\/\w+/)) return 'Edit';
    return 'Content';
  };

  return (
    <div className="min-h-screen bg-[#f0f0f1]">
      {/* NodePress-style admin header bar */}
      <div className="bg-[#1d2327] px-6 py-2">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-bold tracking-tight text-[#f0f0f1]">NodePress</span>
            <span className="text-sm text-[#a7aaad]">{getPageTitle()}</span>
          </div>
        </div>
      </div>

      {/* NodePress-style submenu tabs */}
      <div className="border-b border-[#c3c4c7] bg-white">
        <div className="mx-auto max-w-7xl px-6">
          <nav className="-mb-px flex items-center gap-0">
            {tabs.map((tab) => (
              <Link
                key={tab.href + tab.label}
                href={tab.href}
                className={cn(
                  'relative inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium transition-colors',
                  isActive(tab)
                    ? 'text-[#1d2327] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#1d2327]'
                    : 'text-[#50575e] hover:text-[#1d2327]',
                )}
              >
                {tab.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>

      {/* Page content */}
      <div className="mx-auto max-w-7xl px-6 py-6">{children}</div>
    </div>
  );
}
