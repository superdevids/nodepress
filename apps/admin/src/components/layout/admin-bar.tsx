'use client';

import { useState, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { getInitials } from '@/lib/utils';
import { NotificationDropdown } from './notification-dropdown';

export function AdminBar() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { get } = useApi();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await get<{ count: number }>('/notifications/unread-count');
      if (res?.data?.count !== undefined) {
        setUnreadCount(res.data.count);
      }
    } catch {
      // Silently fail — notifications are non-critical
    }
  }, [get]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();

    // Poll every 30 seconds for new notifications
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        !target.closest('[data-notification-bell]') &&
        !target.closest('[data-notification-dropdown]')
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

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

        <div className="relative flex h-full items-center">
          <button
            data-notification-bell
            onClick={() => setShowDropdown(!showDropdown)}
            className="hover:bg-sidebar-accent relative flex h-full items-center px-3"
            aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
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
              <path d="M6 8a6 6 0 0 1 12 0c0 7 4 9 4 9H2s4-2 4-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[14px] items-center justify-center rounded-full bg-red-500 px-[3px] text-[9px] font-bold leading-none text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <NotificationDropdown
              onClose={() => setShowDropdown(false)}
              onUnreadCountChange={setUnreadCount}
            />
          )}
        </div>

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
