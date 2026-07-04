'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useApi } from '@/lib/use-api';

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  icon: string | null;
  readAt: string | null;
  createdAt: string;
}

interface PaginatedResult {
  items: Notification[];
  total: number;
  unread: number;
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) {
    const mins = Math.floor(diffSec / 60);
    return `${mins}m ago`;
  }
  if (diffSec < 86400) {
    const hrs = Math.floor(diffSec / 3600);
    return `${hrs}h ago`;
  }
  if (diffSec < 604800) {
    const days = Math.floor(diffSec / 86400);
    return `${days}d ago`;
  }
  return new Date(dateStr).toLocaleDateString();
}

function NotificationIcon({ type, icon }: { type: string; icon: string | null }) {
  if (icon === 'file-text') {
    return (
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
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    );
  }
  if (icon === 'message-square') {
    return (
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
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    );
  }
  // Default bell icon for other types
  return (
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
      <path d="M6 8a6 6 0 0 1 12 0c0 7 4 9 4 9H2s4-2 4-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

interface NotificationDropdownProps {
  onClose: () => void;
  onUnreadCountChange: (count: number) => void;
}

export function NotificationDropdown({ onClose, onUnreadCountChange }: NotificationDropdownProps) {
  const router = useRouter();
  const { get, post, patch } = useApi();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get<PaginatedResult>('/notifications?limit=10');
      if (res?.data) {
        setNotifications(res.data.items);
        setTotal(res.data.total);
        setUnread(res.data.unread);
        onUnreadCountChange(res.data.unread);
      }
    } catch (err) {
      setError('Failed to load notifications');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, [get, onUnreadCountChange]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const handleMarkAsRead = useCallback(
    async (notification: Notification) => {
      if (notification.readAt) return; // Already read

      try {
        await patch(`/notifications/${notification.id}/read`);
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === notification.id ? { ...n, readAt: new Date().toISOString() } : n,
          ),
        );
        setUnread((prev) => {
          const next = Math.max(0, prev - 1);
          onUnreadCountChange(next);
          return next;
        });
      } catch {
        // Silently fail
      }

      // Navigate to link if present
      if (notification.link) {
        onClose();
        router.push(notification.link);
      }
    },
    [patch, router, onClose, onUnreadCountChange],
  );

  const handleMarkAllRead = useCallback(async () => {
    setMarkingAll(true);
    try {
      await post('/notifications/mark-all-read');
      setNotifications((prev) =>
        prev.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
      );
      setUnread(0);
      onUnreadCountChange(0);
    } catch {
      // Silently fail
    } finally {
      setMarkingAll(false);
    }
  }, [post, onUnreadCountChange]);

  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div
      data-notification-dropdown
      className="bg-popover text-popover-foreground absolute right-0 top-full z-50 w-80 rounded-md border shadow-md"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-3 py-2">
        <span className="text-xs font-semibold">
          Notifications
          {total > 0 && <span className="text-muted-foreground ml-1 font-normal">({total})</span>}
        </span>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="text-primary hover:text-primary/80 text-[11px] font-medium transition-colors disabled:opacity-50"
          >
            {markingAll ? 'Marking...' : 'Mark all read'}
          </button>
        )}
      </div>

      {/* Content */}
      <div className="max-h-[320px] overflow-y-auto">
        {loading && (
          <div className="flex items-center justify-center py-8">
            <div className="border-primary h-5 w-5 animate-spin rounded-full border-2 border-t-transparent" />
          </div>
        )}

        {error && !loading && (
          <div className="px-3 py-8 text-center">
            <p className="text-muted-foreground text-xs">{error}</p>
            <button
              onClick={fetchNotifications}
              className="text-primary mt-2 text-[11px] font-medium hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && notifications.length === 0 && (
          <div className="px-3 py-8 text-center">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-muted-foreground mx-auto mb-2 h-8 w-8"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 4 9 4 9H2s4-2 4-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <p className="text-muted-foreground text-xs">No notifications</p>
          </div>
        )}

        {!loading && !error && notifications.length > 0 && (
          <ul className="divide-border divide-y">
            {notifications.map((notification) => (
              <li key={notification.id}>
                <button
                  onClick={() => handleMarkAsRead(notification)}
                  className={cn(
                    'hover:bg-accent/50 flex w-full items-start gap-2.5 px-3 py-2.5 text-left transition-colors',
                    !notification.readAt && 'bg-accent/20',
                  )}
                >
                  {/* Icon */}
                  <span
                    className={cn(
                      'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full',
                      !notification.readAt
                        ? 'bg-primary/10 text-primary'
                        : 'bg-muted text-muted-foreground',
                    )}
                  >
                    <NotificationIcon type={notification.type} icon={notification.icon} />
                  </span>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        'text-xs leading-tight',
                        !notification.readAt ? 'font-medium' : 'text-muted-foreground',
                      )}
                    >
                      {notification.title}
                    </p>
                    {notification.message && (
                      <p className="text-muted-foreground mt-0.5 truncate text-[11px] leading-tight">
                        {notification.message}
                      </p>
                    )}
                    <p className="text-muted-foreground/60 mt-1 text-[10px]">
                      {getRelativeTime(notification.createdAt)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notification.readAt && (
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Footer */}
      {total > 10 && (
        <div className="border-t px-3 py-1.5">
          <button
            onClick={() => {
              onClose();
              router.push('/admin/notifications');
            }}
            className="text-muted-foreground hover:text-foreground w-full text-center text-[11px] transition-colors"
          >
            View all notifications
          </button>
        </div>
      )}
    </div>
  );
}
