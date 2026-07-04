'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/lib/hooks';
import { useApi } from '@/lib/use-api';

const quickEditSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  status: z.enum(['draft', 'published', 'pending']),
});

type QuickEditForm = z.infer<typeof quickEditSchema>;

interface QuickEditProps {
  entry: {
    id: string;
    title: string;
    slug?: string;
    status: string;
    type: string;
  };
  onClose: () => void;
  onSaved: (data: QuickEditForm) => void;
}

export function QuickEdit({ entry, onClose, onSaved }: QuickEditProps) {
  const { success, error } = useToast();
  const { patch } = useApi();
  const autoSaveTimer = React.useRef<ReturnType<typeof setTimeout>>();
  const [isAutoSaving, setIsAutoSaving] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm<QuickEditForm>({
    resolver: zodResolver(quickEditSchema),
    defaultValues: {
      title: entry.title,
      slug: entry.slug || '',
      status: entry.status as QuickEditForm['status'],
    },
  });

  const title = watch('title');
  const slug = watch('slug');
  const status = watch('status');

  const debouncedTitle = useDebounce(title, 2000);

  React.useEffect(() => {
    if (dirtyFields.title && debouncedTitle !== entry.title) {
      handleAutoSave();
    }
  }, [debouncedTitle]);

  const handleAutoSave = async () => {
    setIsAutoSaving(true);
    try {
      await patch(`/api/content/${entry.type || 'post'}/${entry.id}`, {
        title,
        slug: slug || '',
        status: (status === 'pending' ? 'draft' : status) as 'draft' | 'published',
      });
      onSaved({ title, slug: slug || '', status });
    } catch {
      // silent
    } finally {
      setIsAutoSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  };

  const onSubmit = async (data: QuickEditForm) => {
    try {
      const bodyStatus = data.status === 'pending' ? 'draft' : data.status;
      await patch(`/api/content/${entry.type || 'post'}/${entry.id}`, {
        title: data.title,
        slug: data.slug || '',
        status: bodyStatus,
      });
      onSaved(data);
      success('Updated!', 'Content has been updated.');
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      error('Failed to update', message);
    }
  };

  return (
    <div className="bg-muted/50 my-2 rounded-md border p-4" onKeyDown={handleKeyDown}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="qe-title">Title</Label>
            <Input
              id="qe-title"
              {...register('title')}
              className={errors.title ? 'border-destructive' : ''}
              autoFocus
            />
            {errors.title && <p className="text-destructive text-xs">{errors.title.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="qe-slug">Slug</Label>
            <Input id="qe-slug" {...register('slug')} />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(val) => setValue('status', val as QuickEditForm['status'])}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="pending">Pending Review</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center justify-between">
          {isAutoSaving && <span className="text-muted-foreground text-xs">Auto-saving...</span>}
          <div className="ml-auto flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              <X className="mr-1 h-4 w-4" />
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isSubmitting}>
              <Save className="mr-1 h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Update'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
