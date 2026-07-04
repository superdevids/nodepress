'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Plus, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentList } from '@/components/content/content-list';
import { useAuth } from '@/lib/auth';
import { fetchContentList, type ContentEntry } from '@/lib/api-helper';

const typeLabels: Record<string, string> = {
  post: 'Posts',
  page: 'Pages',
};

export default function ContentTypePage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const { token } = useAuth();

  const [items, setItems] = React.useState<ContentEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const pageSize = 20;

  const label = typeLabels[type] || type.charAt(0).toUpperCase() + type.slice(1);

  const loadItems = React.useCallback(() => {
    if (token === undefined) return;
    setIsLoading(true);
    setError(null);

    fetchContentList(type, token, { page, pageSize })
      .then((res) => {
        setItems(res.data ?? []);
        if (res.meta) {
          setTotalPages(res.meta.totalPages);
          setTotal(res.meta.total);
        }
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [type, token, page]);

  React.useEffect(() => {
    loadItems();
  }, [loadItems]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{label}</h1>
          <p className="text-muted-foreground mt-1">Manage all {label.toLowerCase()}.</p>
        </div>
        <Button onClick={() => router.push(`/admin/content/${type}/new`)}>
          <Plus className="mr-2 h-4 w-4" />
          Add New
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          <span className="text-muted-foreground ml-3">Loading {label.toLowerCase()}...</span>
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
              status: entry.status,
              author:
                typeof entry.author === 'object' && entry.author !== null
                  ? entry.author.name
                  : (entry.author ?? 'Unknown'),
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
