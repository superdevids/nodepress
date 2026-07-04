'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FileText, Eye, Edit, MoreHorizontal, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDate } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useApi } from '@/lib/use-api';

interface Entry {
  id: string;
  title: string;
  status: 'published' | 'draft' | 'pending';
  author: string;
  authorAvatar?: string;
  date: string;
  views: number;
  thumbnail?: string;
  type: string;
}

const statusColors: Record<string, 'success' | 'secondary' | 'warning'> = {
  published: 'success',
  draft: 'secondary',
  pending: 'warning',
};

export function RecentlyPublished() {
  const router = useRouter();
  const { get } = useApi();
  const [entries, setEntries] = React.useState<Entry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const fetchEntries = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get<Entry[]>('/api/content/post?status=publish&limit=5');
      setEntries(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load content';
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  }, [get]);

  React.useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recently Published</CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={fetchEntries}
            disabled={loading}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="outline" size="sm" onClick={() => router.push('/admin/content')}>
            <FileText className="mr-2 h-4 w-4" />
            View All
          </Button>
        </div>
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
            <Button variant="outline" size="sm" className="mt-2" onClick={fetchEntries}>
              Retry
            </Button>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-muted-foreground py-8 text-center text-sm">
            No content published yet.
          </div>
        ) : (
          <div className="divide-y">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="hover:bg-muted/50 flex items-center justify-between px-6 py-3 transition-colors"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  {entry.thumbnail ? (
                    <img
                      src={entry.thumbnail}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <Avatar className="h-8 w-8 shrink-0">
                      <AvatarImage src={entry.authorAvatar} />
                      <AvatarFallback className="text-xs">
                        {(entry.author || '?').charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div className="min-w-0">
                    <button
                      onClick={() => router.push(`/admin/content/${entry.type}/${entry.id}`)}
                      className="hover:text-primary block truncate text-left text-sm font-medium transition-colors"
                    >
                      {entry.title}
                    </button>
                    <div className="text-muted-foreground flex items-center gap-2 text-xs">
                      <span>{entry.author}</span>
                      <span>&middot;</span>
                      <span>{formatDate(entry.date)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant={statusColors[entry.status]}>{entry.status}</Badge>
                  {entry.views > 0 && (
                    <span className="text-muted-foreground flex items-center gap-1 text-xs">
                      <Eye className="h-3 w-3" />
                      {entry.views}
                    </span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => router.push(`/admin/content/${entry.type}/${entry.id}`)}
                      >
                        <Edit className="mr-2 h-4 w-4" /> Quick Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>View Preview</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
