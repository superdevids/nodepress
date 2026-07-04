'use client';

import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { getInitials } from '@/lib/utils';

export function AdminBar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return null;

  const initials = user ? getInitials(user.name) : '?';

  return (
    <div
      id="wpadminbar"
      className={cn(
        'fixed left-0 right-0 top-0 z-[99999] flex h-8 items-center',
        'bg-sidebar text-sidebar-foreground text-xs shadow-sm',
      )}
    >
      <div className="flex h-full items-center px-2">
        <a href="/admin" className="hover:bg-sidebar-accent flex h-full items-center gap-1.5 px-2">
          <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold">
            NP
          </span>
          <span className="font-semibold">NodePress</span>
        </a>
      </div>

      <div className="flex h-full items-center">
        <a
          href="/admin/content/post/new"
          className="hover:bg-sidebar-accent flex h-full items-center gap-1 px-3"
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

      <div className="flex-1" />

      <div className="flex h-full items-center">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:bg-sidebar-accent flex h-full items-center gap-1 px-3"
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

        <button className="hover:bg-sidebar-accent flex h-full items-center px-3">
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

        <div className="group relative flex h-full items-center">
          <button className="hover:bg-sidebar-accent flex h-full items-center gap-1.5 px-3">
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <span className="bg-primary text-primary-foreground flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold">
                {initials}
              </span>
            )}
            <span>{user?.name || 'User'}</span>
          </button>
          <div className="bg-popover absolute right-0 top-full hidden min-w-[160px] rounded-md border p-1 shadow-md group-hover:block">
            <a href="/admin/users" className="hover:bg-muted block rounded-sm px-3 py-1.5 text-xs">
              Profile
            </a>
            <button
              type="button"
              onClick={logout}
              className="hover:bg-muted w-full rounded-sm px-3 py-1.5 text-left text-xs"
            >
              Log Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
