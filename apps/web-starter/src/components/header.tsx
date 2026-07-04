'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@nodepressjs/ui';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ThemeToggle } from './theme-toggle';
import { SearchForm } from './search-form';

const NAV_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/blog', label: 'Blog' },
  { href: '/projects', label: 'Projects' },
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
];

const BLOG_DROPDOWN_ITEMS = [
  { href: '/blog', label: 'All Posts' },
  { href: '/category/tutorials', label: 'Tutorials' },
  { href: '/category/opinion', label: 'Opinion' },
  { href: '/category/releases', label: 'Releases' },
];

export function Header() {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isBlogDropdownOpen, setIsBlogDropdownOpen] = useState(false);
  const blogDropdownRef = useRef<HTMLLIElement>(null);
  const dropdownTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close menus on Escape key
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsMobileMenuOpen(false);
      setIsSearchOpen(false);
      setIsBlogDropdownOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Close mobile menu and search on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsSearchOpen(false);
    setIsBlogDropdownOpen(false);
  }, [pathname]);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isMobileMenuOpen]);

  // Close blog dropdown when clicking outside
  useEffect(() => {
    if (!isBlogDropdownOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (blogDropdownRef.current && !blogDropdownRef.current.contains(e.target as Node)) {
        setIsBlogDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isBlogDropdownOpen]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleBlogDropdownEnter = () => {
    if (dropdownTimeoutRef.current) {
      clearTimeout(dropdownTimeoutRef.current);
      dropdownTimeoutRef.current = null;
    }
    setIsBlogDropdownOpen(true);
  };

  const handleBlogDropdownLeave = () => {
    dropdownTimeoutRef.current = setTimeout(() => {
      setIsBlogDropdownOpen(false);
    }, 150);
  };

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (dropdownTimeoutRef.current) {
        clearTimeout(dropdownTimeoutRef.current);
      }
    };
  }, []);

  return (
    <header className="border-wp-border bg-background/95 supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50 w-full border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Site logo / name */}
        <Link
          href="/"
          className="text-wp-primary hover:text-wp-primary-hover shrink-0 text-xl font-bold tracking-tight transition-colors"
        >
          NodePress
        </Link>

        {/* Desktop Navigation — hidden on mobile */}
        <nav className="hidden md:flex md:items-center md:gap-1" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            // Blog gets special dropdown treatment on desktop
            if (item.label === 'Blog') {
              return (
                <li
                  key={item.href}
                  ref={blogDropdownRef}
                  className="relative list-none"
                  onMouseEnter={handleBlogDropdownEnter}
                  onMouseLeave={handleBlogDropdownLeave}
                  onFocus={handleBlogDropdownEnter}
                  onBlur={() => {
                    // Small delay so focus can move into the dropdown
                    dropdownTimeoutRef.current = setTimeout(() => {
                      setIsBlogDropdownOpen(false);
                    }, 150);
                  }}
                >
                  <Link
                    href={item.href}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive(item.href)
                        ? 'bg-wp-primary/10 text-wp-primary'
                        : 'text-wp-text-light hover:bg-wp-hover-bg hover:text-wp-text',
                    )}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                    aria-expanded={isBlogDropdownOpen}
                    aria-haspopup="true"
                  >
                    {item.label}
                    {/* Chevron down */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={cn(
                        'transition-transform duration-200',
                        isBlogDropdownOpen && 'rotate-180',
                      )}
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </Link>

                  {/* Blog dropdown panel */}
                  <div
                    role="menu"
                    aria-label="Blog categories"
                    className={cn(
                      'border-wp-border bg-background absolute left-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border p-1.5 shadow-lg transition-all duration-200',
                      isBlogDropdownOpen
                        ? 'visible translate-y-0 opacity-100'
                        : 'invisible -translate-y-1 opacity-0',
                    )}
                  >
                    {BLOG_DROPDOWN_ITEMS.map((sub) => (
                      <Link
                        key={sub.href}
                        href={sub.href}
                        role="menuitem"
                        className={cn(
                          'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                          isActive(sub.href)
                            ? 'bg-wp-primary/10 text-wp-primary'
                            : 'text-wp-text-light hover:bg-wp-hover-bg hover:text-wp-text',
                        )}
                        aria-current={isActive(sub.href) ? 'page' : undefined}
                      >
                        {sub.label}
                      </Link>
                    ))}
                  </div>
                </li>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'inline-flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-wp-primary/10 text-wp-primary'
                    : 'text-wp-text-light hover:bg-wp-hover-bg hover:text-wp-text',
                )}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Right-side actions */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Search toggle button */}
          <button
            type="button"
            onClick={() => setIsSearchOpen((prev) => !prev)}
            className={cn(
              'inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors',
              'text-wp-text-light hover:bg-wp-hover-bg hover:text-wp-text',
              isSearchOpen && 'bg-wp-hover-bg text-wp-text',
            )}
            aria-label={isSearchOpen ? 'Close search' : 'Open search'}
            aria-expanded={isSearchOpen}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
          </button>

          {/* Dark mode toggle */}
          <ThemeToggle />

          {/* Mobile hamburger — visible only on mobile */}
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className={cn(
              'inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors md:hidden',
              'text-wp-text-light hover:bg-wp-hover-bg hover:text-wp-text',
            )}
            aria-label={isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-menu"
          >
            {isMobileMenuOpen ? (
              /* Close (X) icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            ) : (
              /* Hamburger icon */
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Inline search bar — animated expand/collapse */}
      <div
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isSearchOpen ? 'border-wp-border max-h-20 border-t' : 'max-h-0',
        )}
      >
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <SearchForm placeholder="Search articles..." />
        </div>
      </div>

      {/* Mobile menu panel — animated slide down */}
      <div
        id="mobile-menu"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        className={cn(
          'overflow-hidden transition-all duration-300 ease-in-out md:hidden',
          isMobileMenuOpen ? 'border-wp-border max-h-[480px] border-t' : 'max-h-0',
        )}
      >
        <nav className="space-y-1 px-4 pb-6 pt-4 sm:px-6" aria-label="Mobile navigation">
          {NAV_ITEMS.map((item) => (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center rounded-md px-3 py-2.5 text-base font-medium transition-colors',
                  isActive(item.href)
                    ? 'bg-wp-primary/10 text-wp-primary'
                    : 'text-wp-text-light hover:bg-wp-hover-bg hover:text-wp-text',
                )}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>

              {/* Show Blog sub-items inline on mobile */}
              {item.label === 'Blog' && (
                <div className="border-wp-border ml-4 mt-1 space-y-1 border-l-2 pl-3">
                  {BLOG_DROPDOWN_ITEMS.map((sub) => (
                    <Link
                      key={sub.href}
                      href={sub.href}
                      className={cn(
                        'flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors',
                        isActive(sub.href)
                          ? 'bg-wp-primary/10 text-wp-primary'
                          : 'text-wp-text-light hover:bg-wp-hover-bg hover:text-wp-text',
                      )}
                      aria-current={isActive(sub.href) ? 'page' : undefined}
                    >
                      {sub.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>
    </header>
  );
}
