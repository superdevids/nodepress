'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ContentEditor } from '@/components/content/content-editor';
import { useAuth } from '@/lib/auth';
import { fetchContentEntry, type ContentEntry } from '@/lib/api-helper';

export default function EditContentPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;
  const id = params.id as string;
  const { token } = useAuth();

  const [entry, setEntry] = React.useState<ContentEntry | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadEntry = React.useCallback(() => {
    if (token === undefined) return;
    setIsLoading(true);
    setError(null);

    fetchContentEntry(type, id, token)
      .then((res) => {
        setEntry(res.data);
      })
      .catch((err: Error) => {
        setError(err.message);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [type, id, token]);

  React.useEffect(() => {
    loadEntry();
  }, [loadEntry]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="text-muted-foreground h-6 w-6 animate-spin" />
        <span className="text-muted-foreground ml-3">Loading entry...</span>
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
          Try Again
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
      {/* Back button */}
      <div className="border-b px-6 py-3">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/content/${type}`)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to {type}s
        </Button>
      </div>

      {/* Page header */}
      <div className="flex items-center justify-between border-b px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">
          Edit {type.charAt(0).toUpperCase() + type.slice(1)}
        </h1>
        <span className="text-muted-foreground text-xs">ID: {id}</span>
      </div>

      {/* Editor */}
      <ContentEditor contentType={type} entryId={id} initialData={initialData} />
    </div>
  );
}
