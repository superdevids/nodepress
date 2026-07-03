'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Image, Users, MessageSquare, Plug, Layout } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface StatItem {
  label: string;
  value: number;
  icon: React.ElementType;
  trend?: { direction: 'up' | 'down'; percentage: number };
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

function useDashboardStats() {
  const [stats, setStats] = React.useState<DashboardStats | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch('/api/admin/dashboard/stats')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load stats');
        return res.json();
      })
      .then((data: DashboardStats) => {
        setStats(data);
        setLoading(false);
      })
      .catch((err: Error) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  return { stats, loading, error };
}

export function AtAGlance() {
  const router = useRouter();
  const { stats, loading, error } = useDashboardStats();

  if (error) return null;

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
