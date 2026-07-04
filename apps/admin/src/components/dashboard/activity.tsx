'use client';

import * as React from 'react';
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  Upload,
  Settings,
  UserPlus,
  Plug,
  LogIn,
  LogOut,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/use-api';

interface Activity {
  action: string;
  target: string;
  user: string;
  time: string;
  type:
    | 'create'
    | 'update'
    | 'delete'
    | 'publish'
    | 'upload'
    | 'settings'
    | 'user'
    | 'plugin'
    | 'login'
    | 'logout';
}

const typeIcons: Record<string, React.ElementType> = {
  create: Plus,
  update: Pencil,
  delete: Trash2,
  publish: Megaphone,
  upload: Upload,
  settings: Settings,
  user: UserPlus,
  plugin: Plug,
  login: LogIn,
  logout: LogOut,
};

const typeColors: Record<string, string> = {
  create: 'text-emerald-600 dark:text-emerald-400',
  update: 'text-blue-600 dark:text-blue-400',
  delete: 'text-red-600 dark:text-red-400',
  publish: 'text-violet-600 dark:text-violet-400',
  upload: 'text-amber-600 dark:text-amber-400',
  settings: 'text-sky-600 dark:text-sky-400',
  user: 'text-green-600 dark:text-green-400',
  plugin: 'text-purple-600 dark:text-purple-400',
  login: 'text-gray-600 dark:text-gray-400',
  logout: 'text-gray-600 dark:text-gray-400',
};

const bgColors: Record<string, string> = {
  create: 'bg-emerald-100 dark:bg-emerald-900/30',
  update: 'bg-blue-100 dark:bg-blue-900/30',
  delete: 'bg-red-100 dark:bg-red-900/30',
  publish: 'bg-violet-100 dark:bg-violet-900/30',
  upload: 'bg-amber-100 dark:bg-amber-900/30',
  settings: 'bg-sky-100 dark:bg-sky-900/30',
  user: 'bg-green-100 dark:bg-green-900/30',
  plugin: 'bg-purple-100 dark:bg-purple-900/30',
  login: 'bg-gray-100 dark:bg-gray-800',
  logout: 'bg-gray-100 dark:bg-gray-800',
};

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export function ActivityWidget() {
  const { get } = useApi();
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchActivity = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get<Activity[]>('/api/dashboard/activity');
      setActivities(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load activity';
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recent Activity</CardTitle>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={fetchActivity}
          disabled={loading}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          </div>
        ) : fetchError ? (
          <div className="flex flex-col items-center px-6 py-8 text-center">
            <AlertCircle className="text-destructive mb-2 h-6 w-6" />
            <p className="text-destructive text-sm">{fetchError}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchActivity}>
              Retry
            </Button>
          </div>
        ) : activities.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">No recent activity</div>
        ) : (
          <div className="divide-y">
            {activities.map((act, i) => {
              const Icon = typeIcons[act.type] || Pencil;
              return (
                <div
                  key={i}
                  className="hover:bg-muted/50 flex items-start gap-3 px-6 py-3 transition-colors"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${bgColors[act.type]}`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${typeColors[act.type]}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      <span className="font-medium">{act.user}</span>{' '}
                      <span className="text-muted-foreground">{act.action.toLowerCase()}</span>{' '}
                      <span className="font-medium">{act.target}</span>
                    </p>
                  </div>
                  <span className="text-muted-foreground shrink-0 whitespace-nowrap text-xs">
                    {getRelativeTime(act.time)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
