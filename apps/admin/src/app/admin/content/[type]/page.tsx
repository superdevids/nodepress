'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentList } from '@/components/content/content-list';
import { useApi } from '@/lib/use-api';

const typeLabels: Record<string, string> = {
  post: 'Posts',
  page: 'Pages',
};

interface ContentEntry {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'publish' | 'pending' | 'private';
  authorId: string;
  createdAt: string;
  updatedAt: string;
  type: string;
}

export default function ContentTypePage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const { get } = useApi();

  const [items, setItems] = React.useState<ContentEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const pageSize = 20;

  const label = typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);

  const loadItems = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await get<ContentEntry[]>(`/api/content/${type}?page=${page}&limit=${pageSize}`);
      setItems(res.data ?? []);
      if (res.meta) {
        setTotalPages(res.meta.totalPages);
        setTotal(res.meta.total);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load content';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [type, page, get]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{label}</h1>
          <p className="text-muted-foreground mt-1">
            Manage all {label.toLowerCase()}. {total > 0 && `${total} total`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadItems} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => router.push(`/admin/content/${type}/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-background rounded-md border">
          <div className="p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 border-b py-3 last:border-0">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-5 flex-1" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="text-destructive mb-3 h-8 w-8" />
          <p className="text-destructive font-medium">Failed to load {label.toLowerCase()}</p>
          <p className="text-muted-foreground mt-1 text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadItems}>
            Try Again
          </Button>
        </div>
      ) : (
        <>
          <ContentList
            items={items.map((entry) => ({
              id: entry.id,
              title: entry.title,
              slug: entry.slug,
              status: entry.status as 'draft' | 'published' | 'pending' | 'trashed',
              author: entry.authorId,
              date: new Date(entry.createdAt),
              type: entry.type,
            }))}
            type={type}
          />

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="text-muted-foreground flex items-center justify-between text-sm">
              <span>
                Page {page} of {totalPages} ({total} items)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
