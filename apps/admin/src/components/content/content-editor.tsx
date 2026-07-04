'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ContentForm, type ContentFormData } from './content-form';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';

const BlockEditor = dynamic(() => import('@nodepressjs/editor').then((mod) => mod.BlockEditor), {
  ssr: false,
  loading: () => (
    <div className="min-h-[400px] p-6">
      <Skeleton className="mb-4 h-8 w-full max-w-lg" />
      <Skeleton className="mb-8 h-4 w-64" />
      <Skeleton className="h-80 w-full" />
    </div>
  ),
});

interface ContentEditorProps {
  contentType: string;
  entryId?: string;
  initialData?: Partial<
    ContentFormData & {
      categories?: { id: string; name: string; slug: string }[];
      tags?: { id: string; name: string; slug: string }[];
      createdAt?: string;
      modifiedAt?: string;
    }
  >;
}

export function ContentEditor({ contentType, entryId, initialData }: ContentEditorProps) {
  const [content, setContent] = React.useState<string>(initialData?.content || '');
  const [showBlockEditor, setShowBlockEditor] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { post, patch } = useApi();
  const { success, error: showError } = useToast();
  const router = useRouter();

  /**
   * Strip HTML tags for a plain-text excerpt fallback.
   */
  const stripHtml = (html: string): string => {
    if (typeof document !== 'undefined') {
      const div = document.createElement('div');
      div.innerHTML = html;
      return div.textContent || div.innerText || '';
    }
    return html.replace(/<[^>]*>/g, '');
  };

  const handleSubmit = async (data: ContentFormData, action: 'draft' | 'publish') => {
    setIsSubmitting(true);

    const slug =
      data.slug ||
      data.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

    const payload = {
      title: data.title,
      slug,
      content: content || data.content || '',
      excerpt: data.excerpt || stripHtml(content || data.content || '').slice(0, 160),
      status: action === 'publish' ? ('published' as const) : ('draft' as const),
      visibility: data.visibility || 'public',
      password: data.password || undefined,
      isSticky: data.isSticky || false,
      allowComments: data.allowComments ?? true,
      categoryIds: data.categoryIds || [],
      tags: data.tags || [],
      featuredImageUrl: data.featuredImageUrl || undefined,
      featuredImageAlt: data.featuredImageAlt || undefined,
    };

    try {
      if (entryId) {
        await patch(`/api/content/${contentType}/${entryId}`, payload);
        success('Updated!', 'Content has been updated successfully.');
        router.refresh();
      } else {
        const res = await post<{ id: string }>(`/api/content/${contentType}`, payload);
        success('Created!', 'Content has been created successfully.');
        router.push(`/admin/content/${contentType}/${res.data.id}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      showError('Failed to save', message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditorUpdate = React.useCallback(({ editor }: { editor: any }) => {
    const html = editor.getHTML();
    setContent(html);
  }, []);

  // Get category IDs and tag names from initialData for the form
  const categoryIds = React.useMemo(
    () => initialData?.categories?.map((c: { id: string }) => c.id) || [],
    [initialData?.categories],
  );
  const tagNames = React.useMemo(
    () => initialData?.tags?.map((t: { name: string }) => t.name) || [],
    [initialData?.tags],
  );

  return (
    <div className="space-y-0">
      {/* Editor tabs */}
      <div className="mb-4 flex items-center gap-0 border-b border-[#dcdcde] bg-white">
        <button
          type="button"
          onClick={() => setShowBlockEditor(true)}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            showBlockEditor
              ? 'text-[#1d2327] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#1d2327]'
              : 'text-[#8c8f94] hover:text-[#50575e]'
          }`}
        >
          Block Editor
        </button>
        <button
          type="button"
          onClick={() => setShowBlockEditor(false)}
          className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
            !showBlockEditor
              ? 'text-[#1d2327] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#1d2327]'
              : 'text-[#8c8f94] hover:text-[#50575e]'
          }`}
        >
          Classic Editor
        </button>
      </div>

      {/* Block editor standalone */}
      {showBlockEditor && (
        <div className="mb-6 rounded-lg border border-[#dcdcde] bg-white shadow-sm">
          <div className="border-b border-[#dcdcde] px-4 py-2.5">
            <span className="text-sm font-medium text-[#1d2327]">Content Blocks</span>
          </div>
          <div className="min-h-[400px]">
            <BlockEditor
              content={content || initialData?.content}
              onUpdate={handleEditorUpdate}
              placeholder="Start writing or type / to choose a block..."
            />
          </div>
        </div>
      )}

      {/* Content form with meta boxes */}
      <ContentForm
        contentType={contentType}
        initialData={{
          ...initialData,
          title: initialData?.title || '',
          slug: initialData?.slug || '',
          content: content || initialData?.content || '',
          excerpt: initialData?.excerpt || '',
          categoryIds,
          tags: tagNames,
          isSticky: initialData?.isSticky || false,
          allowComments: initialData?.allowComments ?? true,
        }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
