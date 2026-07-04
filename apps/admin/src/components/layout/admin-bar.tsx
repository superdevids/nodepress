'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth';
import { useApi } from '@/lib/use-api';
import { getInitials } from '@/lib/utils';
import { NotificationDropdown } from './notification-dropdown';
import { ScreenOptions } from '@/components/admin/screen-options';

/**
 * WordPress-Style Admin Bar
 *
 * Features:
 * - Fixed top bar (like WordPress #wpadminbar)
 * - Logo/brand on left
 * - "+ New" dropdown (Post, Page, Media)
 * - Search box (type-ahead)
 * - Notification bell with unread count badge
 * - User avatar + dropdown (Profile, Settings, Logout)
 * - "Visit Site" link (opens in new tab)
 * - Screen Options dropdown trigger
 * - Auto-hide on scroll down, show on scroll up
 */

export function AdminBar() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const { get } = useApi();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNewDropdown, setShowNewDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const newDropdownRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ─── Scroll hide/show ─────────────────────────────────────
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 50) {
        setVisible(false);
      } else {
        setVisible(true);
      }
      setLastScrollY(currentScrollY);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // ─── Notification polling ─────────────────────────────────
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await get<{ count: number }>('/notifications/unread-count');
      if (res?.data?.count !== undefined) {
        setUnreadCount(res.data.count);
      }
    } catch {
      // Non-critical
    }
  }, [get]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadCount]);

  // ─── Close dropdowns on outside click ─────────────────────
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (newDropdownRef.current && !newDropdownRef.current.contains(target)) {
        setShowNewDropdown(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // ─── Keyboard shortcuts for search ────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && searchFocused) {
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [searchFocused]);

  if (isLoading) return null;
  if (!isAuthenticated) return null;

  const initials = user ? getInitials(user.name) : '?';

  const handleNew = (path: string) => {
    setShowNewDropdown(false);
    router.push(path);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/admin/content?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchFocused(false);
    }
  };

  return (
    <div
      id="wpadminbar"
      className={cn(
        'fixed left-0 right-0 top-0 z-[99999]',
        'transition-transform duration-300 ease-in-out',
        visible ? 'translate-y-0' : '-translate-y-full',
      )}
    >
      {/* Main bar */}
      <div className="flex h-8 items-center bg-[#1d2327] text-xs text-[#f0f0f1] shadow-sm">
        {/* Logo / Brand */}
        <div className="flex h-full items-center">
          <a
            href="/admin"
            className="flex h-full items-center gap-1.5 px-2 transition-colors hover:bg-[#2c3338]"
          >
            <span className="flex h-5 w-5 items-center justify-center rounded bg-[#2271b1] text-[10px] font-bold text-white">
              NP
            </span>
            <span className="text-sm font-semibold">NodePress</span>
          </a>
        </div>

        {/* "+ New" Dropdown (WordPress-style) */}
        <div className="relative flex h-full items-center" ref={newDropdownRef}>
          <button
            onClick={() => setShowNewDropdown(!showNewDropdown)}
            className="flex h-full items-center gap-1 px-3 transition-colors hover:bg-[#2c3338]"
            aria-haspopup="true"
            aria-expanded={showNewDropdown}
            aria-label="Add New"
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
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 opacity-60"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showNewDropdown && (
            <div className="absolute left-0 top-full z-[100000] min-w-[160px] rounded-md border border-[#c3c4c7] bg-white py-1 shadow-lg dark:border-[#50575e] dark:bg-[#2c3338]">
              <button
                onClick={() => handleNew('/admin/content/post/new')}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#3c434a] transition-colors hover:bg-[#f0f6fc] dark:text-[#f0f0f1] dark:hover:bg-[#1d2327]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
                <span>Post</span>
              </button>
              <button
                onClick={() => handleNew('/admin/content/page/new')}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#3c434a] transition-colors hover:bg-[#f0f6fc] dark:text-[#f0f0f1] dark:hover:bg-[#1d2327]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
                <span>Page</span>
              </button>
              <div className="my-1 border-t border-[#c3c4c7] dark:border-[#50575e]" />
              <button
                onClick={() => handleNew('/admin/media')}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#3c434a] transition-colors hover:bg-[#f0f6fc] dark:text-[#f0f0f1] dark:hover:bg-[#1d2327]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                  <circle cx="9" cy="9" r="2" />
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                </svg>
                <span>Media</span>
              </button>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Search Box (WordPress-style, hidden on small screens) */}
        <form onSubmit={handleSearch} className="hidden h-full items-center md:flex">
          <div
            className={cn(
              'relative flex items-center transition-all duration-200',
              searchFocused ? 'w-64' : 'w-48',
            )}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none absolute left-2 h-3.5 w-3.5 text-[#9ca2a7]"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              ref={searchInputRef}
              type="search"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              className="h-6 w-full rounded-sm border-0 bg-[#2c3338] pl-7 pr-2 text-xs text-[#f0f0f1] placeholder-[#9ca2a7] focus:outline-none focus:ring-1 focus:ring-[#2271b1]"
              aria-label="Search"
            />
          </div>
        </form>

        {/* Screen Options */}
        <div className="flex h-full items-center">
          <ScreenOptions />
        </div>

        {/* Visit Site */}
        {typeof window !== 'undefined' && (
          <a
            href={`${window.location.protocol}//${window.location.host}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex h-full items-center gap-1 px-3 transition-colors hover:bg-[#2c3338]"
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
            <span className="hidden sm:inline">Visit Site</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 opacity-50"
            >
              <path d="M7 7h10v10" />
              <path d="M7 17 21 3" />
            </svg>
          </a>
        )}

        {/* Notifications */}
        <div className="relative flex h-full items-center" ref={notifRef}>
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative flex h-full items-center px-3 transition-colors hover:bg-[#2c3338]"
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
          {showNotifications && (
            <NotificationDropdown
              onClose={() => setShowNotifications(false)}
              onUnreadCountChange={setUnreadCount}
            />
          )}
        </div>

        {/* User Avatar + Dropdown */}
        <div className="relative flex h-full items-center" ref={userMenuRef}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex h-full items-center gap-1.5 px-3 transition-colors hover:bg-[#2c3338]"
            aria-haspopup="true"
            aria-expanded={showUserMenu}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-5 w-5 rounded-full object-cover"
              />
            ) : (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#2271b1] text-[9px] font-bold text-white">
                {initials}
              </span>
            )}
            <span className="hidden sm:inline">{user?.name || 'User'}</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3 w-3 opacity-60"
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full z-[100000] min-w-[180px] rounded-md border border-[#c3c4c7] bg-white py-1 shadow-lg dark:border-[#50575e] dark:bg-[#2c3338]">
              <div className="mb-1 border-b border-[#c3c4c7] px-3 py-2 dark:border-[#50575e]">
                <p className="text-sm font-medium text-[#3c434a] dark:text-[#f0f0f1]">
                  {user?.name}
                </p>
                <p className="text-xs text-[#787c82] dark:text-[#9ca2a7]">{user?.email}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  router.push('/admin/users');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#3c434a] transition-colors hover:bg-[#f0f6fc] dark:text-[#f0f0f1] dark:hover:bg-[#1d2327]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
                Profile
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  router.push('/admin/settings');
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[#3c434a] transition-colors hover:bg-[#f0f6fc] dark:text-[#f0f0f1] dark:hover:bg-[#1d2327]"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                Settings
              </button>
              <div className="my-1 border-t border-[#c3c4c7] dark:border-[#50575e]" />
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  logout();
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 transition-colors hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" x2="9" y1="12" y2="12" />
                </svg>
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Subtle divider below bar */}
      <div className="h-[1px] bg-[#c3c4c7] dark:bg-[#50575e]" />
    </div>
  );
}
