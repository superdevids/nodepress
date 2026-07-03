"use client";

import { cn } from "@/lib/utils";

/**
 * Admin Bar — floating top toolbar (Gap I-03)
 *
 * WordPress-compatible admin bar that appears at the top of the page
 * for logged-in users. Provides quick access to:
 * - NodePress logo / home
 * - Content counts and quick actions
 * - User menu (profile, logout)
 * - Frontend preview link
 * - Screen options toggle
 */
export function AdminBar() {
  // TODO: Wire up actual auth state
  const isLoggedIn = true;

  if (!isLoggedIn) return null;

  return (
    <div
      id="wpadminbar"
      className={cn(
        "fixed left-0 right-0 top-0 z-[99999] flex h-8 items-center",
        "bg-sidebar text-sidebar-foreground text-xs shadow-sm",
      )}
    >
      <div className="flex h-full items-center px-2">
        {/* Logo */}
        <a
          href="/admin"
          className="flex h-full items-center gap-1.5 px-2 hover:bg-sidebar-accent"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded bg-primary text-[10px] font-bold text-primary-foreground">
            NP
          </span>
          <span className="font-semibold">NodePress</span>
        </a>
      </div>

      {/* Left section — quick links */}
      <div className="flex h-full items-center">
        <a
          href="/admin/content/new"
          className="flex h-full items-center gap-1 px-3 hover:bg-sidebar-accent"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M5 12h14" />
            <path d="M12 5v14" />
          </svg>
          <span>New</span>
        </a>
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Right section — user menu */}
      <div className="flex h-full items-center">
        {/* Frontend link */}
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-full items-center gap-1 px-3 hover:bg-sidebar-accent"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" x2="21" y1="14" y2="3" />
          </svg>
          <span>View Site</span>
        </a>

        {/* Notifications */}
        <button className="flex h-full items-center px-3 hover:bg-sidebar-accent">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-3.5 w-3.5"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 4 9 4 9H2s4-2 4-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </button>

        {/* User avatar & name */}
        <button className="flex h-full items-center gap-1.5 px-3 hover:bg-sidebar-accent">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[9px] font-bold text-primary-foreground">
            A
          </span>
          <span>Admin</span>
        </button>
      </div>
    </div>
  );
}
