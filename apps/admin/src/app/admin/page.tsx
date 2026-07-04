'use client';

import * as React from 'react';
import {
  FileText,
  File,
  Users,
  Image,
  Activity,
  Loader2,
  AlertCircle,
  RefreshCw,
  MessageSquare,
  Eye,
  TrendingUp,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/use-api';
import { formatDate } from '@/lib/utils';

interface AtAGlance {
  posts: number;
  pages: number;
  comments: number;
  users: number;
  media: number;
  published: number;
  drafts: number;
}

interface ActivityItem {
  id: string;
  actor: { id: string; name: string; email: string };
  action: string;
  targetType: string;
  targetId: string;
  createdAt: string;
}

const statCards = [
  {
    label: 'Total Posts',
    key: 'posts' as const,
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-950',
  },
  {
    label: 'Total Pages',
    key: 'pages' as const,
    icon: File,
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-950',
  },
  {
    label: 'Comments',
    key: 'comments' as const,
    icon: MessageSquare,
    color: 'text-purple-600 dark:text-purple-400',
    bg: 'bg-purple-100 dark:bg-purple-950',
  },
  {
    label: 'Users',
    key: 'users' as const,
    icon: Users,
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-950',
  },
  {
    label: 'Media Files',
    key: 'media' as const,
    icon: Image,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-950',
  },
  {
    label: 'Published',
    key: 'published' as const,
    icon: Eye,
    color: 'text-green-600 dark:text-green-400',
    bg: 'bg-green-100 dark:bg-green-950',
  },
  {
    label: 'Drafts',
    key: 'drafts' as const,
    icon: FileText,
    color: 'text-gray-600 dark:text-gray-400',
    bg: 'bg-gray-100 dark:bg-gray-950',
  },
];

export default function AdminDashboardPage() {
  const { get } = useApi();
  const [stats, setStats] = React.useState<AtAGlance | null>(null);
  const [activity, setActivity] = React.useState<ActivityItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchDashboard = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const [statsRes, activityRes] = await Promise.all([
        get<AtAGlance>('/api/dashboard/at-a-glance'),
        get<ActivityItem[]>('/api/dashboard/activity'),
      ]);
      setStats(statsRes.data);
      setActivity(Array.isArray(activityRes.data) ? activityRes.data : []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load dashboard data';
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // ─── Loading skeleton ─────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="mt-2 h-4 w-72" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 7 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
                <Skeleton className="mt-1 h-3 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-5 w-36" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="mt-1 h-3 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Error state ──────────────────────────────────────────

  if (fetchError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="text-destructive font-medium">Failed to load dashboard</p>
        <p className="text-muted-foreground mt-1 text-sm">{fetchError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchDashboard}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  // ─── Main render ──────────────────────────────────────────

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome to NodePress. Here&apos;s an overview of your site.
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          const value = stats?.[stat.key] ?? 0;
          return (
            <Card key={stat.key}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value.toLocaleString()}</div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {stat.key === 'published'
                    ? `${((stats?.published ?? 0) / Math.max(stats?.posts ?? 1, 1)) * 100}% of posts`
                    : stat.key === 'drafts'
                      ? `${((stats?.drafts ?? 0) / Math.max(stats?.posts ?? 1, 1)) * 100}% of posts`
                      : stat.key === 'media'
                        ? 'Total media files'
                        : `Total ${stat.label.toLowerCase()}`}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="text-muted-foreground h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {activity.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center">
                <Eye className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              activity.map((item) => (
                <div
                  key={item.id}
                  className="hover:bg-muted/50 flex items-center justify-between px-6 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium">
                      {item.actor.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{item.action}</span>
                        <span className="text-muted-foreground">
                          {' '}{item.targetType}{' '}
                        </span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        by {item.actor.name} &middot; {formatDate(item.createdAt)}
                      </p>
                    </div>
                  </div>
                  <TrendingUp className="text-muted-foreground/50 h-4 w-4" />
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
