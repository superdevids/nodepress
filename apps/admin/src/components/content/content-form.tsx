'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dynamic from 'next/dynamic';
import {
  Save,
  Send,
  Eye,
  Image,
  Lock,
  Globe,
  Clock,
  MessageSquare,
  History,
  ChevronDown,
  ChevronUp,
  X,
  FileText,
  Star,
  Upload,
  ExternalLink,
  Pencil,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';
import { cn } from '@/lib/utils';

const BlockEditor = dynamic(() => import('@nodepressjs/editor').then((mod) => mod.BlockEditor), {
  ssr: false,
});

/* ── Schema ──────────────────────────────────────────── */

const contentSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
  status: z.enum(['draft', 'publish', 'pending', 'private']).default('draft'),
  visibility: z.enum(['public', 'password', 'private']).default('public'),
  password: z.string().optional(),
  isSticky: z.boolean().default(false),
  allowComments: z.boolean().default(true),
  categoryIds: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  featuredImageUrl: z.string().optional(),
  featuredImageAlt: z.string().optional(),
});

export type ContentFormData = z.infer<typeof contentSchema>;

/* ── Meta Box Component ──────────────────────────────── */

function MetaBox({
  title,
  children,
  defaultOpen = true,
  className,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className={cn('rounded-lg border border-[#dcdcde] bg-white shadow-sm', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between border-b border-[#dcdcde] px-3.5 py-2.5 text-left text-sm font-medium text-[#1d2327] transition-colors hover:bg-[#f6f7f7]"
      >
        <span>{title}</span>
        {isOpen ? (
          <ChevronUp className="h-3.5 w-3.5 text-[#787c82]" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5 text-[#787c82]" />
        )}
      </button>
      {isOpen && <div className="p-3.5">{children}</div>}
    </div>
  );
}

/* ── Props ───────────────────────────────────────────── */

interface ContentFormProps {
  initialData?: Partial<
    ContentFormData & {
      categories?: { id: string; name: string; slug: string }[];
      tags?: { id: string; name: string; slug: string }[];
      createdAt?: string;
      modifiedAt?: string;
    }
  >;
  contentType: string;
  onSubmit: (data: ContentFormData, action: 'draft' | 'publish') => Promise<void>;
  isSubmitting?: boolean;
}

/* ── Sample data for categories/tags for demo ────────── */

const SAMPLE_CATEGORIES = [
  { id: 'cat-1', name: 'Uncategorized', slug: 'uncategorized', count: 3 },
  { id: 'cat-2', name: 'Technology', slug: 'technology', count: 8 },
  { id: 'cat-3', name: 'Design', slug: 'design', count: 5 },
  { id: 'cat-4', name: 'Business', slug: 'business', count: 2 },
  { id: 'cat-5', name: 'Lifestyle', slug: 'lifestyle', count: 6 },
];

const SAMPLE_TAGS = [
  { id: 'tag-1', name: 'javascript', slug: 'javascript', count: 10 },
  { id: 'tag-2', name: 'react', slug: 'react', count: 7 },
  { id: 'tag-3', name: 'typescript', slug: 'typescript', count: 5 },
  { id: 'tag-4', name: 'css', slug: 'css', count: 4 },
  { id: 'tag-5', name: 'nodejs', slug: 'nodejs', count: 3 },
  { id: 'tag-6', name: 'nextjs', slug: 'nextjs', count: 3 },
  { id: 'tag-7', name: 'tailwind', slug: 'tailwind', count: 2 },
];

/* ── Main Component ──────────────────────────────────── */

export function ContentForm({
  initialData,
  contentType,
  onSubmit,
  isSubmitting: externalSubmitting,
}: ContentFormProps) {
  const { success, error: showError } = useToast();
  const { post } = useApi();
  const [internalSubmitting, setInternalSubmitting] = React.useState(false);
  const isSubmitting = externalSubmitting ?? internalSubmitting;
  const actionRef = React.useRef<'draft' | 'publish'>('publish');
  const contentRef = React.useRef<string | undefined>(initialData?.content);

  // Derive initial categories/tags from initialData
  const initialCategoryIds = React.useMemo(
    () => initialData?.categories?.map((c: { id: string }) => c.id) || [],
    [initialData?.categories],
  );
  const initialTagNames = React.useMemo(
    () => initialData?.tags?.map((t: { name: string }) => t.name) || [],
    [initialData?.tags],
  );

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      excerpt: initialData?.excerpt || '',
      content: initialData?.content || '',
      status: (initialData?.status as ContentFormData['status']) || 'draft',
      visibility: 'public',
      password: initialData?.password || '',
      isSticky: initialData?.isSticky || false,
      allowComments: initialData?.allowComments ?? true,
      categoryIds: initialCategoryIds,
      tags: initialTagNames,
      featuredImageUrl: initialData?.featuredImageUrl || '',
      featuredImageAlt: initialData?.featuredImageAlt || '',
    },
  });

  const status = watch('status');
  const visibility = watch('visibility');
  const isSticky = watch('isSticky');
  const allowComments = watch('allowComments');
  const selectedCategoryIds = watch('categoryIds') || [];
  const tagValues = watch('tags') || [];

  /* ── Tag input state ──────────────────────────────── */
  const [tagInput, setTagInput] = React.useState('');
  const [allCategories] = React.useState(SAMPLE_CATEGORIES);
  const [allTags] = React.useState(SAMPLE_TAGS);

  // Categories search/filter
  const [catSearch, setCatSearch] = React.useState('');

  // Featured image
  const [showFeaturedDialog, setShowFeaturedDialog] = React.useState(false);
  const featuredImageUrl = watch('featuredImageUrl');

  // Revisions
  const revisionCount = React.useMemo(() => Math.floor(Math.random() * 8) + 1, []);

  const filteredCategories = allCategories.filter(
    (c) => !catSearch || c.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  const handleSubmitForm = async (data: ContentFormData) => {
    setInternalSubmitting(true);
    try {
      await onSubmit({ ...data, content: contentRef.current || data.content }, actionRef.current);
    } catch (err) {
      // Error is handled by parent
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

  const handleEditorObjectUpdate = React.useCallback(
    ({ editor }: { editor: any }) => {
      const html = editor.getHTML();
      contentRef.current = html;
      setValue('content', html);
    },
    [setValue],
  );

  /* ── Tag add/remove ───────────────────────────────── */
  const addTag = (tagName: string) => {
    const trimmed = tagName.trim();
    if (!trimmed || tagValues.includes(trimmed)) return;
    setValue('tags', [...tagValues, trimmed], { shouldDirty: true });
  };

  const removeTag = (tagName: string) => {
    setValue(
      'tags',
      tagValues.filter((t: string) => t !== tagName),
      { shouldDirty: true },
    );
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
      setTagInput('');
    }
    if (e.key === 'Backspace' && !tagInput && tagValues.length > 0) {
      removeTag(tagValues[tagValues.length - 1]);
    }
  };

  /* ── Category toggle ──────────────────────────────── */
  const toggleCategory = (catId: string) => {
    const current = selectedCategoryIds;
    const updated = current.includes(catId)
      ? current.filter((id: string) => id !== catId)
      : [...current, catId];
    setValue('categoryIds', updated, { shouldDirty: true });
  };

  /* ── Featured image handling ──────────────────────── */
  const handleSetFeaturedImage = () => {
    // In production, this would open the media library
    const mockUrl = 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800&q=80';
    setValue('featuredImageUrl', mockUrl);
    setShowFeaturedDialog(false);
    success('Featured image set', 'The featured image has been updated.');
  };

  const handleRemoveFeaturedImage = () => {
    setValue('featuredImageUrl', '');
    setValue('featuredImageAlt', '');
  };

  /* ── Auto-generate slug from title ────────────────── */
  const titleValue = watch('title');

  React.useEffect(() => {
    const currentSlug = watch('slug');
    if (!currentSlug && titleValue) {
      const generatedSlug = titleValue
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setValue('slug', generatedSlug);
    }
  }, [titleValue]);

  const isEditing = !!initialData?.title;

  return (
    <form onSubmit={handleSubmit(handleSubmitForm)} className="space-y-0">
      {/* ===== MAIN GRID: Editor + Sidebar ===== */}
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-6 lg:flex-row lg:gap-6">
          {/* ── Main Editor Area ── */}
          <div className="min-w-0 flex-1 space-y-4">
            {/* Title field (extra large, like NodePress) */}
            <div className="rounded-lg border border-[#dcdcde] bg-white p-4 shadow-sm">
              <input
                {...register('title')}
                placeholder={`Add ${contentType} title`}
                className="w-full border-0 bg-transparent px-0 text-2xl font-bold text-[#1d2327] placeholder:text-[#8c8f94] focus:outline-none focus:ring-0"
                autoFocus
              />
              {errors.title && (
                <p className="mt-1 text-xs text-[#d63638]">{errors.title.message}</p>
              )}
            </div>

            {/* Permalink display */}
            <div className="flex items-center gap-2 rounded-lg border border-[#dcdcde] bg-white px-4 py-2 shadow-sm">
              <Globe className="h-3.5 w-3.5 shrink-0 text-[#8c8f94]" />
              <span className="font-mono text-xs text-[#8c8f94]">/{contentType}/</span>
              <input
                {...register('slug')}
                className="min-w-0 flex-1 border-0 bg-transparent px-0 font-mono text-xs text-[#50575e] placeholder:text-[#c3c4c7] focus:outline-none focus:ring-0"
                placeholder="slug"
              />
              <button
                type="button"
                className="text-xs text-[#2271b1] hover:text-[#135e96]"
                title="Edit permalink"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>

            {/* Block Editor */}
            <div className="rounded-lg border border-[#dcdcde] bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-[#dcdcde] px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-[#1d2327]">Content</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    className="rounded bg-[#f0f0f1] px-2 py-1 text-xs font-medium text-[#50575e] hover:bg-[#dcdcde]"
                  >
                    Visual
                  </button>
                  <button
                    type="button"
                    className="rounded px-2 py-1 text-xs font-medium text-[#8c8f94] hover:bg-[#f0f0f1]"
                  >
                    Text
                  </button>
                </div>
              </div>
              <div className="min-h-[400px]">
                <BlockEditor
                  content={initialData?.content}
                  onUpdate={handleEditorObjectUpdate}
                  placeholder="Start writing or type / to choose a block..."
                />
              </div>
            </div>
          </div>

          {/* ── Right Sidebar: Meta Boxes ── */}
          <div className="w-full space-y-4 lg:w-80 xl:w-96">
            {/* 1. PUBLISH meta box */}
            <MetaBox title="Publish" defaultOpen={true}>
              <div className="space-y-3">
                {/* Status */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-[#50575e]">Status</Label>
                  <Select
                    value={status}
                    onValueChange={(val) => setValue('status', val as ContentFormData['status'])}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">Draft</SelectItem>
                      <SelectItem value="pending">Pending Review</SelectItem>
                      <SelectItem value="publish">Published</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Visibility */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium text-[#50575e]">Visibility</Label>
                  <Select
                    value={visibility}
                    onValueChange={(val) =>
                      setValue('visibility', val as ContentFormData['visibility'])
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">
                        <span className="flex items-center gap-2">
                          <Globe className="h-3 w-3" /> Public
                        </span>
                      </SelectItem>
                      <SelectItem value="password">
                        <span className="flex items-center gap-2">
                          <Lock className="h-3 w-3" /> Password Protected
                        </span>
                      </SelectItem>
                      <SelectItem value="private">
                        <span className="flex items-center gap-2">
                          <Lock className="h-3 w-3" /> Private
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {visibility === 'password' && (
                    <Input
                      {...register('password')}
                      className="mt-1 h-8 text-xs"
                      placeholder="Enter password"
                      type="password"
                    />
                  )}
                </div>

                {/* Sticky */}
                <div className="flex items-center gap-2">
                  <Switch
                    id="is-sticky"
                    checked={isSticky}
                    onCheckedChange={(v) => setValue('isSticky', v)}
                  />
                  <Label
                    htmlFor="is-sticky"
                    className="cursor-pointer text-xs font-medium text-[#50575e]"
                  >
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-[#dba617]" />
                      Stick to the front page
                    </span>
                  </Label>
                </div>

                <Separator className="bg-[#dcdcde]" />

                {/* Publish date info */}
                {initialData?.createdAt && (
                  <div className="flex items-center gap-1.5 text-xs text-[#8c8f94]">
                    <Clock className="h-3 w-3" />
                    <span>Published: {new Date(initialData.createdAt).toLocaleDateString()}</span>
                  </div>
                )}
                {initialData?.modifiedAt && (
                  <div className="flex items-center gap-1.5 text-xs text-[#8c8f94]">
                    <Clock className="h-3 w-3" />
                    <span>Modified: {new Date(initialData.modifiedAt).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Action buttons */}
                <div className="space-y-2 pt-1">
                  <Button
                    type="submit"
                    variant="outline"
                    size="sm"
                    className="h-8 w-full gap-1.5 text-xs"
                    disabled={isSubmitting}
                    onClick={() => {
                      actionRef.current = 'draft';
                    }}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {isSubmitting && actionRef.current === 'draft'
                      ? 'Saving Draft...'
                      : 'Save Draft'}
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    className="h-8 w-full gap-1.5 text-xs"
                    disabled={isSubmitting}
                    onClick={() => {
                      actionRef.current = 'publish';
                    }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    {isSubmitting && actionRef.current === 'publish'
                      ? 'Publishing...'
                      : isEditing
                        ? 'Update'
                        : 'Publish'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-full gap-1.5 text-xs text-[#50575e]"
                  >
                    <Eye className="h-3.5 w-3.5" />
                    Preview
                  </Button>
                </div>
              </div>
            </MetaBox>

            {/* 2. CATEGORIES meta box */}
            <MetaBox title="Categories" defaultOpen={true}>
              <div className="space-y-2">
                <Input
                  placeholder="Search categories..."
                  className="h-8 text-xs"
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                />
                <div className="max-h-[200px] space-y-1 overflow-y-auto">
                  {filteredCategories.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1 py-1 text-xs text-[#3c434a] hover:bg-[#f0f0f1]"
                    >
                      <Checkbox
                        checked={selectedCategoryIds.includes(cat.id)}
                        onCheckedChange={() => toggleCategory(cat.id)}
                      />
                      <span className="flex-1">{cat.name}</span>
                      <span className="text-[#8c8f94]">({cat.count})</span>
                    </label>
                  ))}
                  {filteredCategories.length === 0 && (
                    <p className="py-2 text-xs text-[#8c8f94]">No categories found</p>
                  )}
                </div>
                {/* Add New Category inline */}
                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="mt-1 text-xs text-[#2271b1] hover:text-[#135e96] hover:underline"
                    >
                      + Add New Category
                    </button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Category</DialogTitle>
                      <DialogDescription>Create a new content category.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3 py-3">
                      <div className="space-y-1">
                        <Label className="text-xs">Name</Label>
                        <Input className="h-9 text-sm" placeholder="Category name" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Slug</Label>
                        <Input className="h-9 text-sm" placeholder="category-slug" />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Parent Category</Label>
                        <Select>
                          <SelectTrigger className="h-9 text-sm">
                            <SelectValue placeholder="None" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None (top-level)</SelectItem>
                            {allCategories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="button" size="sm" className="h-8">
                        Add New Category
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </MetaBox>

            {/* 3. TAGS meta box */}
            <MetaBox title="Tags" defaultOpen={true}>
              <div className="space-y-2">
                <div className="flex flex-wrap gap-1.5">
                  {tagValues.map((tag: string) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="flex items-center gap-1 bg-[#f0f0f1] px-2 py-0.5 text-[10px] font-normal text-[#50575e]"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="text-[#8c8f94] hover:text-[#d63638]"
                      >
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-1 rounded-md border border-[#dcdcde] bg-white px-2 py-1">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tagValues.length === 0 ? 'Add tag...' : ''}
                    className="min-w-0 flex-1 border-0 bg-transparent p-0 text-xs text-[#3c434a] placeholder:text-[#8c8f94] focus:outline-none focus:ring-0"
                  />
                  {tagInput && (
                    <button
                      type="button"
                      onClick={() => {
                        addTag(tagInput);
                        setTagInput('');
                      }}
                      className="text-xs text-[#2271b1] hover:text-[#135e96]"
                    >
                      Add
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-[#8c8f94]">Separate with commas or press Enter</p>
                {/* Popular tags */}
                {allTags.length > 0 && (
                  <div className="pt-1">
                    <p className="mb-1.5 text-[10px] font-medium text-[#8c8f94]">Popular tags</p>
                    <div className="flex flex-wrap gap-1">
                      {allTags.slice(0, 6).map((tag) => (
                        <button
                          key={tag.id}
                          type="button"
                          onClick={() => addTag(tag.name)}
                          className="rounded bg-[#f0f0f1] px-1.5 py-0.5 text-[10px] text-[#50575e] transition-colors hover:bg-[#2271b1] hover:text-white"
                        >
                          {tag.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </MetaBox>

            {/* 4. FEATURED IMAGE meta box */}
            <MetaBox title="Featured Image" defaultOpen={true}>
              {featuredImageUrl ? (
                <div className="space-y-2">
                  <div className="relative overflow-hidden rounded-md border border-[#dcdcde]">
                    <img
                      src={featuredImageUrl}
                      alt="Featured"
                      className="h-32 w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveFeaturedImage}
                      className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <Input
                    {...register('featuredImageAlt')}
                    className="h-8 text-xs"
                    placeholder="Alt text"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 w-full text-xs"
                    onClick={() => setShowFeaturedDialog(true)}
                  >
                    <Upload className="mr-1 h-3 w-3" />
                    Replace Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div
                    className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed border-[#dcdcde] bg-[#f6f7f7] px-4 py-6 text-center transition-colors hover:bg-[#f0f0f1]"
                    onClick={() => setShowFeaturedDialog(true)}
                  >
                    <Image className="mb-2 h-8 w-8 text-[#8c8f94]" />
                    <p className="text-xs font-medium text-[#50575e]">Set featured image</p>
                    <p className="mt-0.5 text-[10px] text-[#8c8f94]">
                      Click to upload or browse media
                    </p>
                  </div>
                  <Dialog open={showFeaturedDialog} onOpenChange={setShowFeaturedDialog}>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Set Featured Image</DialogTitle>
                        <DialogDescription>
                          Choose an image from the media library or upload a new one.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="flex items-center justify-center rounded-md border-2 border-dashed border-[#dcdcde] bg-[#f6f7f7] py-12">
                        <div className="text-center">
                          <Upload className="mx-auto mb-3 h-10 w-10 text-[#8c8f94]" />
                          <p className="text-sm text-[#50575e]">
                            Drop files here or click to upload
                          </p>
                          <p className="mt-1 text-xs text-[#8c8f94]">JPEG, PNG, WebP up to 10MB</p>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowFeaturedDialog(false)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSetFeaturedImage}>
                          Use This Image
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
            </MetaBox>

            {/* 5. EXCERPT meta box */}
            <MetaBox title="Excerpt" defaultOpen={false}>
              <div className="space-y-1.5">
                <Textarea
                  {...register('excerpt')}
                  className="min-h-[80px] text-xs leading-relaxed"
                  placeholder="Write a brief excerpt for your content..."
                />
                <p className="text-[10px] text-[#8c8f94]">
                  Excerpts are optional hand-crafted summaries of your content. They&apos;re used in
                  RSS feeds and search results.
                </p>
              </div>
            </MetaBox>

            {/* 6. DISCUSSION meta box */}
            <MetaBox title="Discussion" defaultOpen={false}>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Switch
                    id="allow-comments"
                    checked={allowComments}
                    onCheckedChange={(v) => setValue('allowComments', v)}
                  />
                  <Label
                    htmlFor="allow-comments"
                    className="cursor-pointer text-xs font-medium text-[#50575e]"
                  >
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" />
                      Allow comments
                    </span>
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch id="allow-pings" defaultChecked />
                  <Label
                    htmlFor="allow-pings"
                    className="cursor-pointer text-xs font-medium text-[#50575e]"
                  >
                    Allow trackbacks and pingbacks
                  </Label>
                </div>
              </div>
            </MetaBox>

            {/* 7. REVISIONS meta box */}
            <MetaBox title="Revisions" defaultOpen={false}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-[#50575e]">
                  <History className="h-3.5 w-3.5 text-[#8c8f94]" />
                  <span>
                    {revisionCount} revision{revisionCount !== 1 ? 's' : ''} saved
                  </span>
                </div>
                <button
                  type="button"
                  className="text-xs text-[#2271b1] hover:text-[#135e96] hover:underline"
                >
                  <ExternalLink className="mr-0.5 inline h-3 w-3" />
                  Browse revisions
                </button>
              </div>
            </MetaBox>
          </div>
        </div>
      </div>
    </form>
  );
}
