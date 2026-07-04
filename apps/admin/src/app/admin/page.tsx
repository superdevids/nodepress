'use client';

import * as React from 'react';
import {
  FileText,
  File,
  Users,
  Image,
  Eye,
  TrendingUp,
  Activity,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/use-api';

interface DashboardStats {
  posts: number;
  pages: number;
  users: number;
  mediaFiles: number;
  mediaSize: string;
  postsTrend?: string;
  pagesTrend?: string;
  usersTrend?: string;
  activeNow?: number;
}

interface ActivityItem {
  action: string;
  title: string;
  date: string;
  author: string;
}

interface DashboardData {
  stats: DashboardStats;
  recentActivity: ActivityItem[];
}

const statConfig = [
  {
    label: 'Total Posts',
    key: 'posts' as const,
    icon: FileText,
    trendKey: 'postsTrend' as const,
    fallbackTrend: '+0 this week',
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-100 dark:bg-blue-950',
  },
  {
    label: 'Total Pages',
    key: 'pages' as const,
    icon: File,
    trendKey: 'pagesTrend' as const,
    fallbackTrend: '+0 this week',
    color: 'text-emerald-600 dark:text-emerald-400',
    bg: 'bg-emerald-100 dark:bg-emerald-950',
  },
  {
    label: 'Users',
    key: 'users' as const,
    icon: Users,
    trendKey: 'usersTrend' as const,
    fallbackTrend: '0 active now',
    color: 'text-violet-600 dark:text-violet-400',
    bg: 'bg-violet-100 dark:bg-violet-950',
  },
  {
    label: 'Media Files',
    key: 'mediaFiles' as const,
    icon: Image,
    trendKey: 'mediaSize' as const,
    fallbackTrend: '0 MB total',
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-100 dark:bg-amber-950',
  },
];

export default function AdminDashboardPage() {
  const { get } = useApi();
  const [data, setData] = React.useState<DashboardData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchDashboard = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get<DashboardData>('/dashboard');
      setData(res.data);
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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="text-destructive font-medium">Failed to load dashboard</p>
        <p className="text-muted-foreground mt-1 text-sm">{fetchError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchDashboard}>
          Try Again
        </Button>
      </div>
    );
  }

  const stats = data?.stats;
  const recentActivity = data?.recentActivity ?? [];

  const getStatValue = (key: string): string => {
    if (!stats) return '0';
    switch (key) {
      case 'posts':
        return String(stats.posts ?? 0);
      case 'pages':
        return String(stats.pages ?? 0);
      case 'users':
        return String(stats.users ?? 0);
      case 'mediaFiles':
        return String(stats.mediaFiles ?? 0);
      default:
        return '0';
    }
  };

  const getTrend = (stat: (typeof statConfig)[number]): string => {
    if (!stats) return stat.fallbackTrend;
    if (stat.trendKey === 'mediaSize') return stats.mediaSize || stat.fallbackTrend;
    const trend = stats[stat.trendKey];
    return (trend as string) || stat.fallbackTrend;
  };

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
        {statConfig.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  {stat.label}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bg}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getStatValue(stat.key)}</div>
                <p className="text-muted-foreground mt-1 text-xs">{getTrend(stat)}</p>
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
            {recentActivity.length === 0 ? (
              <div className="text-muted-foreground py-12 text-center">
                <Eye className="mx-auto mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">No recent activity</p>
              </div>
            ) : (
              recentActivity.map((item, i) => (
                <div
                  key={i}
                  className="hover:bg-muted/50 flex items-center justify-between px-6 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="bg-muted text-muted-foreground flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium">
                      {item.author.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm">
                        <span className="font-medium">{item.title}</span>
                      </p>
                      <p className="text-muted-foreground text-xs">
                        {item.action} by {item.author} &middot; {item.date}
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
