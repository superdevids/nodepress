'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

const draftSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  content: z.string().optional(),
  type: z.string().default('post'),
});

type DraftForm = z.infer<typeof draftSchema>;

export function QuickDraft() {
  const router = useRouter();
  const { success, error: showError } = useToast();
  const { post } = useApi();
  const [contentType, setContentType] = React.useState('post');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<DraftForm>({
    resolver: zodResolver(draftSchema),
    defaultValues: { type: 'post' },
  });

  const onSubmit = async (data: DraftForm) => {
    try {
      const res = await post<{ id: string }>('/api/content/post', {
        title: data.title,
        content: data.content || '',
        status: 'draft',
        type: data.type,
      });
      const newId = res.data?.id || Math.random().toString(36).slice(2);
      success('Draft saved!', `"${data.title}" has been saved as a draft.`);
      reset();
      router.push(`/admin/content/${data.type}/${newId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save draft';
      showError('Failed to save draft', message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Quick Draft</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
          <div>
            <Input
              placeholder="Title"
              {...register('title')}
              className={errors.title ? 'border-destructive' : ''}
            />
            {errors.title && (
              <p className="text-destructive mt-1 text-xs">{errors.title.message}</p>
            )}
          </div>
          <Textarea
            placeholder="Write a brief description..."
            className="min-h-[100px] resize-none"
            {...register('content')}
          />
          <div className="flex items-center gap-2">
            <Select value={contentType} onValueChange={(v) => setContentType(v)}>
              <SelectTrigger className="flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="post">Post</SelectItem>
                <SelectItem value="page">Page</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Send className="mr-1.5 h-4 w-4" /> Save Draft
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
