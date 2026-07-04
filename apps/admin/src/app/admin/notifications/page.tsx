'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck, Trash2, RefreshCw, AlertCircle, Inbox, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApi } from '@/lib/use-api';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: string;
}

const typeStyles: Record<string, { bg: string; dot: string }> = {
  info: { bg: 'bg-blue-50 dark:bg-blue-950/30', dot: 'bg-blue-500' },
  success: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', dot: 'bg-emerald-500' },
  warning: { bg: 'bg-amber-50 dark:bg-amber-950/30', dot: 'bg-amber-500' },
  error: { bg: 'bg-red-50 dark:bg-red-950/30', dot: 'bg-red-500' },
};

export default function NotificationsPage() {
  const router = useRouter();
  const { get, patch, del } = useApi();
  const { success, error: showError } = useToast();
  const [notifications, setNotifications] = React.useState<Notification[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

  const fetchNotifications = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get<Notification[]>('/notifications');
      setNotifications(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load notifications';
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAsRead = async (id: string) => {
    try {
      await patch(`/notifications/${id}/read`, {});
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch {
      showError('Failed to mark as read', '');
    }
  };

  const markAllAsRead = async () => {
    try {
      await patch('/notifications/read-all', {});
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      success('All notifications marked as read', '');
    } catch {
      showError('Failed to mark all as read', '');
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await del(`/notifications/${id}`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      success('Notification deleted', '');
    } catch {
      showError('Failed to delete notification', '');
    }
  };

  const filtered = filter === 'all' ? notifications : notifications.filter((n) => !n.read);
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
            <Bell className="h-6 w-6 text-[#2271b1]" />
            Notifications
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {unreadCount > 0
              ? `You have ${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}`
              : 'No unread notifications'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <CheckCheck className="mr-1.5 h-4 w-4" />
              Mark All Read
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={fetchNotifications} disabled={loading}>
            <RefreshCw className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 border-b">
        <button
          onClick={() => setFilter('all')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'border-[#2271b1] text-[#2271b1]'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter('unread')}
          className={`border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'unread'
              ? 'border-[#2271b1] text-[#2271b1]'
              : 'text-muted-foreground hover:text-foreground border-transparent'
          }`}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 p-4">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="mt-2 h-3 w-full" />
                <Skeleton className="mt-1 h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && fetchError && (
        <div className="flex flex-col items-center py-12 text-center">
          <AlertCircle className="text-destructive mb-3 h-10 w-10" />
          <p className="text-destructive font-medium">Failed to load notifications</p>
          <p className="text-muted-foreground mt-1 text-sm">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchNotifications}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {/* Empty */}
      {!loading && !fetchError && filtered.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Inbox className="text-muted-foreground mb-4 h-16 w-16" />
          <h3 className="text-lg font-medium">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
          </h3>
          <p className="text-muted-foreground mt-1 text-sm">
            {filter === 'unread'
              ? "You've read everything. Good job!"
              : 'Notifications will appear here when something happens.'}
          </p>
        </div>
      )}

      {/* Notifications list */}
      {!loading && !fetchError && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((notification) => {
            const style = typeStyles[notification.type] || typeStyles.info;
            return (
              <div
                key={notification.id}
                className={`rounded-lg border p-4 transition-colors ${
                  notification.read ? 'bg-background' : `${style.bg} border-l-4`
                }`}
                style={
                  !notification.read ? { borderLeftColor: 'var(--primary, #2271b1)' } : undefined
                }
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    {!notification.read && (
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${style.dot}`} />
                    )}
                    <div className="min-w-0">
                      <h4
                        className={`text-sm font-medium ${notification.read ? 'text-muted-foreground' : ''}`}
                      >
                        {notification.title}
                      </h4>
                      <p className="text-muted-foreground mt-0.5 line-clamp-2 text-sm">
                        {notification.message}
                      </p>
                      <p className="text-muted-foreground/60 mt-1 text-xs">
                        {formatDate(notification.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => markAsRead(notification.id)}
                        title="Mark as read"
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive h-7 w-7"
                      onClick={() => deleteNotification(notification.id)}
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
