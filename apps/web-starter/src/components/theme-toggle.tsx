'use client';

import { useState, useEffect } from 'react';
import { cn } from '@nodepressjs/ui';

type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function getStoredTheme(): Theme | null {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem('theme');
    if (stored === 'light' || stored === 'dark') return stored;
  }
  return null;
}

function applyTheme(theme: Theme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme | null>(null);

  // Hydration-safe: determine and apply initial theme on mount only
  useEffect(() => {
    const resolved = getStoredTheme() ?? getSystemTheme();
    setTheme(resolved);
    applyTheme(resolved);
  }, []);

  // Listen for system preference changes when no explicit stored preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');

    const handler = (e: MediaQueryListEvent) => {
      if (getStoredTheme() === null) {
        const next = e.matches ? 'dark' : 'light';
        setTheme(next);
        applyTheme(next);
      }
    };

    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  function toggle() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('theme', next);
    applyTheme(next);
  }

  const isDark = theme === 'dark';
  const label = isDark ? 'Toggle light mode' : 'Toggle dark mode';

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-2 text-sm font-medium transition-colors',
        'text-wp-text-light hover:bg-wp-hover-bg hover:text-wp-text',
        'focus-visible:ring-wp-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      )}
      aria-label={label}
    >
      {theme !== null ? (
        <span className="relative h-5 w-5" aria-hidden="true">
          {/* Sun icon — visible in light mode */}
          <svg
            className={cn(
              'absolute inset-0 h-5 w-5 transition-all duration-300',
              isDark ? 'rotate-90 scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100',
            )}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z"
            />
          </svg>

          {/* Moon icon — visible in dark mode */}
          <svg
            className={cn(
              'absolute inset-0 h-5 w-5 transition-all duration-300',
              isDark ? 'rotate-0 scale-100 opacity-100' : '-rotate-90 scale-0 opacity-0',
            )}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z"
            />
          </svg>
        </span>
      ) : (
        /* Prevent layout shift during SSR/hydration */
        <span className="block h-5 w-5" aria-hidden="true" />
      )}
    </button>
  );
}
