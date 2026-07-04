'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, AlertCircle, RefreshCw, FileText } from 'lucide-react';
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
  categories: { id: string; name: string; slug: string }[];
  tags: { id: string; name: string; slug: string }[];
  isSticky: boolean;
  isPasswordProtected: boolean;
  allowComments: boolean;
  createdAt: string;
  modifiedAt: string;
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

  /* ── Loading state ───────────────────────────────── */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <div className="rounded-lg border border-[#c3c4c7] bg-white p-6">
          <Skeleton className="h-8 w-full max-w-lg" />
          <Skeleton className="mt-4 h-4 w-64" />
          <Skeleton className="mt-8 h-96 w-full" />
        </div>
      </div>
    );
  }

  /* ── Error state ─────────────────────────────────── */
  if (error) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#c3c4c7] bg-white p-6 text-center">
        <AlertCircle className="mb-3 h-12 w-12 text-[#d63638]" />
        <h2 className="text-lg font-semibold text-[#1d2327]">Failed to load content</h2>
        <p className="mt-1 max-w-md text-sm text-[#646970]">{error}</p>
        <div className="mt-4 flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={loadEntry}>
            <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
          </Button>
          <Button variant="ghost" size="sm" onClick={() => router.push(`/admin/content/${type}`)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Back
          </Button>
        </div>
      </div>
    );
  }

  /* ── Empty / Not found state ─────────────────────── */
  if (!entry) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#c3c4c7] bg-white p-6 text-center">
        <FileText className="mb-4 h-16 w-16 text-[#c3c4c7]" />
        <h2 className="text-lg font-semibold text-[#1d2327]">Content not found</h2>
        <p className="mt-1 max-w-sm text-sm text-[#646970]">
          The {type} you&apos;re looking for doesn&apos;t exist or has been deleted.
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push(`/admin/content/${type}`)}
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" /> Back to {type}s
        </Button>
      </div>
    );
  }

  /* ── Normal render ───────────────────────────────── */
  const initialData = {
    title: entry.title,
    slug: entry.slug,
    content: entry.content ?? '',
    excerpt: entry.excerpt ?? '',
    categories: entry.categories ?? [],
    tags: entry.tags ?? [],
    isSticky: entry.isSticky ?? false,
    isPasswordProtected: entry.isPasswordProtected ?? false,
    allowComments: entry.allowComments ?? true,
    status: entry.status,
    createdAt: entry.createdAt,
    modifiedAt: entry.modifiedAt,
  };

  return (
    <div className="space-y-0">
      {/* Back navigation */}
      <div className="mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin/content${type === 'page' ? '?type=page' : ''}`)}
          className="text-[#50575e] hover:text-[#1d2327]"
        >
          <ArrowLeft className="mr-1.5 h-4 w-4" />
          Back to {type === 'post' ? 'Posts' : 'Pages'}
        </Button>
      </div>

      {/* Editor */}
      <ContentEditor contentType={type} entryId={id} initialData={initialData} />
    </div>
  );
}
