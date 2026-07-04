'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import { Save, Send, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/toast';

const BlockEditor = dynamic(() => import('@nodepressjs/editor').then((mod) => mod.BlockEditor), {
  ssr: false,
});

const contentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
});

export type ContentFormData = z.infer<typeof contentSchema>;

interface ContentFormProps {
  initialData?: Partial<ContentFormData>;
  contentType: string;
  onSubmit: (data: ContentFormData, action: 'draft' | 'publish') => Promise<void>;
  isSubmitting?: boolean;
}

export function ContentForm({
  initialData,
  contentType,
  onSubmit,
  isSubmitting: externalSubmitting,
}: ContentFormProps) {
  const { success, error } = useToast();
  const [internalSubmitting, setInternalSubmitting] = React.useState(false);
  const isSubmitting = externalSubmitting ?? internalSubmitting;
  const actionRef = React.useRef<'draft' | 'publish'>('publish');
  const contentRef = React.useRef<string | undefined>(initialData?.content);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: initialData,
  });

  const handleSave = async (data: ContentFormData, action: 'draft' | 'publish') => {
    setInternalSubmitting(true);
    try {
      await onSubmit({ ...data, content: contentRef.current }, action);
    } catch (err) {
      // Error is already handled by the parent (content-editor)
    } finally {
      setInternalSubmitting(false);
    }
  };

  const handleEditorUpdate = React.useCallback(
    (html: string) => {
      contentRef.current = html;
      setValue('content', html);
    },
    [setValue],
  );

  return (
    <form
      onSubmit={handleSubmit((data) => handleSave(data, actionRef.current))}
      className="space-y-6"
    >
      {/* Title */}
      <div className="space-y-1.5">
        <Input
          placeholder={`Add ${contentType} title`}
          className="h-12 border-none px-0 text-2xl font-bold focus-visible:ring-0"
          {...register('title')}
        />
        {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <Label>Permalink</Label>
        <div className="text-muted-foreground flex items-center gap-1 text-sm">
          <span>/{contentType}/</span>
          <Input
            {...register('slug')}
            className="inline-flex h-8 w-auto min-w-[200px]"
            placeholder="slug"
          />
        </div>
      </div>

      {/* Content — Block Editor */}
      <div className="space-y-1.5">
        <Label>Content</Label>
        <div className="bg-background min-h-[300px] rounded-md border">
          <BlockEditor
            content={initialData?.content}
            onUpdate={handleEditorUpdate}
            placeholder="Start writing..."
          />
        </div>
      </div>

      {/* Excerpt */}
      <div className="space-y-1.5">
        <Label>Excerpt</Label>
        <Textarea
          {...register('excerpt')}
          className="min-h-[80px]"
          placeholder="Write a brief excerpt..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button type="button" variant="outline">
          <Eye className="mr-2 h-4 w-4" />
          Preview
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => {
              actionRef.current = 'draft';
            }}
          >
            <Save className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Saving...' : 'Save Draft'}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={() => {
              actionRef.current = 'publish';
            }}
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Publishing...' : 'Publish'}
          </Button>
        </div>
      </div>
    </form>
  );
}
