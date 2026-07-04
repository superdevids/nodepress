'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Image,
  Users,
  MessageSquare,
  Plug,
  Layout,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useApi } from '@/lib/use-api';

interface StatItem {
  label: string;
  value: number;
  icon: React.ElementType;
  href?: string;
}

interface DashboardStats {
  posts: number;
  pages: number;
  media: number;
  comments: number;
  users: number;
  activePlugins: number;
}

export function AtAGlance() {
  const router = useRouter();
  const { get } = useApi();
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const fetchStats = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await get<DashboardStats>('/dashboard/at-a-glance');
      setStats(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load stats';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <AlertCircle className="text-destructive mb-2 h-8 w-8" />
        <p className="text-destructive text-sm font-medium">Failed to load stats</p>
        <p className="text-muted-foreground mt-1 text-xs">{error}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchStats}>
          <RefreshCw className="mr-1.5 h-3 w-3" /> Retry
        </Button>
      </div>
    );
  }

  if (loading || !stats) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="mb-2 h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const items: StatItem[] = [
    {
      label: 'Published Posts',
      value: stats.posts,
      icon: FileText,
      href: '/admin/content',
    },
    {
      label: 'Pages',
      value: stats.pages,
      icon: Layout,
      href: '/admin/content/page',
    },
    {
      label: 'Media Items',
      value: stats.media,
      icon: Image,
      href: '/admin/media',
    },
    {
      label: 'Comments',
      value: stats.comments,
      icon: MessageSquare,
      href: '/admin/content/comment',
    },
    {
      label: 'Users',
      value: stats.users,
      icon: Users,
      href: '/admin/users',
    },
    {
      label: 'Active Plugins',
      value: stats.activePlugins,
      icon: Plug,
      href: '/admin/plugins',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((stat) => (
        <Card
          key={stat.label}
          className="hover:border-primary/50 cursor-pointer transition-all hover:shadow-md"
          onClick={() => stat.href && router.push(stat.href)}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              {stat.label}
            </CardTitle>
            <stat.icon className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
