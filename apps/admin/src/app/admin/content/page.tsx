'use client';

import * as React from 'react';
import Link from 'next/link';
import { Plus, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentList } from '@/components/content/content-list';
import { useNotices } from '@/components/layout/admin-notices';
import { useAuth } from '@/lib/auth';
import { fetchAllContent, type ContentEntry } from '@/lib/api-helper';

export default function ContentPage() {
  const { addNotice } = useNotices();
  const { token } = useAuth();

  const [items, setItems] = React.useState<ContentEntry[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    addNotice({
      type: 'info',
      message: 'Content management is in beta. Some features may be limited.',
      dismissible: true,
    });
  }, [addNotice]);

  const loadContent = React.useCallback(() => {
    if (token === undefined) return;
    setIsLoading(true);
    setError(null);

    fetchAllContent(token)
      .then((res) => {
        setItems(res.data);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [token]);

  React.useEffect(() => {
    loadContent();
  }, [loadContent]);

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Content</h1>
          <p className="text-muted-foreground mt-1">
            Manage all posts, pages, and custom content types.
          </p>
        </div>
        <Link href="/admin/content/post/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
          <span className="text-muted-foreground ml-3">Loading content...</span>
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="text-destructive mb-3 h-8 w-8" />
          <p className="text-destructive font-medium">Failed to load content</p>
          <p className="text-muted-foreground mt-1 text-sm">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={loadContent}>
            Try Again
          </Button>
        </div>
      ) : (
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
        />
      )}
    </div>
  );
}
