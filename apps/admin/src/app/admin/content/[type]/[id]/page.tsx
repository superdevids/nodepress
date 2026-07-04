'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ContentEditor } from '@/components/content/content-editor';
import { useApi } from '@/lib/use-api';

interface ContentEntry {
  id: string;
  type: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: string;
}

export default function EditContentPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const id = params.id as string;
  const { get } = useApi();

  const [entry, setEntry] = React.useState<ContentEntry | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadEntry = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await get<ContentEntry>(`/api/content/${type}/${id}`);
      setEntry(res.data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load entry';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [type, id, get]);

  React.useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  if (isLoading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <AlertCircle className="text-destructive mb-3 h-8 w-8" />
        <p className="text-destructive font-medium">Failed to load entry</p>
        <p className="text-muted-foreground mt-1 text-sm">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={loadEntry}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  const initialData = entry
    ? {
        title: entry.title,
        slug: entry.slug,
        content: entry.content ?? '',
        excerpt: entry.excerpt ?? '',
      }
    : undefined;

  return (
    <div className="space-y-0">
      <div className="border-b px-6 py-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/content/${type}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {type}s
        </Button>
      </div>

      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">
          Edit {type.charAt(0).toUpperCase() + type.slice(1)}
        </h1>
        <span className="text-muted-foreground text-xs">ID: {id}</span>
      </div>

      <ContentEditor contentType={type} entryId={id} initialData={initialData} />
    </div>
  );
}
