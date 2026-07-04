'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ContentForm, type ContentFormData } from './content-form';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/components/ui/toast';

const BlockEditor = dynamic(() => import('@nodepressjs/editor').then((mod) => mod.BlockEditor), {
  ssr: false,
});

interface ContentEditorProps {
  contentType: string;
  entryId?: string;
  initialData?: Partial<ContentFormData>;
}

export function ContentEditor({ contentType, entryId, initialData }: ContentEditorProps) {
  const [content, setContent] = React.useState<string>(initialData?.content || '');
  const [showBlockEditor, setShowBlockEditor] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { post, patch } = useApi();
  const { success, error: showError } = useToast();
  const router = useRouter();

  const handleSubmit = async (data: ContentFormData, action: 'draft' | 'publish') => {
    setIsSubmitting(true);

    const payload = {
      title: data.title,
      slug:
        data.slug ||
        data.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, ''),
      content: content || data.content || '',
      excerpt: data.excerpt || '',
      status: action === 'publish' ? ('published' as const) : ('draft' as const),
    };

    try {
      if (entryId) {
        await patch(`/api/content/${contentType}/${entryId}`, payload);
        success('Updated!', 'Content has been updated successfully.');
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

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowBlockEditor(true)}
          className={`rounded-md px-3 py-1.5 text-sm ${
            showBlockEditor
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Block Editor
        </button>
        <button
          type="button"
          onClick={() => setShowBlockEditor(false)}
          className={`rounded-md px-3 py-1.5 text-sm ${
            !showBlockEditor
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          Classic Editor
        </button>
      </div>

      {showBlockEditor ? (
        <div className="bg-card mb-6 rounded-lg border">
          <BlockEditor content={content} onUpdate={handleEditorUpdate} />
        </div>
      ) : null}

      <ContentForm
        contentType={contentType}
        initialData={{ ...initialData, content }}
        onSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </div>
  );
}
