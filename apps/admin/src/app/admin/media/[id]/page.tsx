'use client';

import * as React from 'react';
import { useRouter, useParams } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Copy,
  Save,
  ImageIcon,
  Music,
  Video,
  FileText,
  FileIcon,
  Calendar,
  HardDrive,
  Maximize2,
  Type,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatDate, formatBytes } from '@/lib/utils';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/components/ui/toast';

// ─── Types ───────────────────────────────────────────────────────────────────

interface MediaDetail {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  altText?: string;
  caption?: string;
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMediaIcon(mimeType: string): { icon: React.ReactNode; label: string; color: string } {
  if (mimeType.startsWith('image/'))
    return { icon: <ImageIcon className="h-16 w-16" />, label: 'Image', color: 'text-emerald-500' };
  if (mimeType.startsWith('video/'))
    return { icon: <Video className="h-16 w-16" />, label: 'Video', color: 'text-blue-500' };
  if (mimeType.startsWith('audio/'))
    return { icon: <Music className="h-16 w-16" />, label: 'Audio', color: 'text-amber-500' };
  if (mimeType.startsWith('application/pdf') || mimeType.startsWith('text/'))
    return { icon: <FileText className="h-16 w-16" />, label: 'Document', color: 'text-red-500' };
  return {
    icon: <FileIcon className="h-16 w-16" />,
    label: 'File',
    color: 'text-muted-foreground',
  };
}

function getTypeBadgeVariant(
  mimeType: string,
): 'default' | 'secondary' | 'info' | 'warning' | 'success' {
  if (mimeType.startsWith('image/')) return 'success';
  if (mimeType.startsWith('video/')) return 'info';
  if (mimeType.startsWith('audio/')) return 'warning';
  return 'secondary';
}

function getTypeLabel(mimeType: string): string {
  const map: Record<string, string> = {
    'image/': 'Image',
    'video/': 'Video',
    'audio/': 'Audio',
    'application/pdf': 'PDF',
    'text/': 'Text',
  };
  const key = Object.keys(map).find((k) => mimeType.startsWith(k));
  if (key) return map[key]!;
  const parts = mimeType.split('/');
  return parts[1]?.toUpperCase() || 'FILE';
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function MediaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { success, error: showError } = useToast();
  const { get, patch, del } = useApi();
  const id = params.id as string;

  const [item, setItem] = React.useState<MediaDetail | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

  const [altText, setAltText] = React.useState('');
  const [caption, setCaption] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [title, setTitle] = React.useState('');

  // ─── Fetch ──────────────────────────────────────────────────────────────
  React.useEffect(() => {
    setLoading(true);
    setFetchError(null);
    get<MediaDetail>(`/media/${id}`)
      .then((res) => {
        const media = res.data;
        setItem(media);
        setTitle(media.name || '');
        setAltText(media.altText || '');
        setCaption(media.caption || '');
        setDescription(media.description || '');
      })
      .catch((err: unknown) => {
        const message = err instanceof Error ? err.message : 'Failed to load media';
        setFetchError(message);
        showError('Error', message);
      })
      .finally(() => setLoading(false));
  }, [id, get, showError]);

  // ─── Save ───────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await patch(`/media/${id}`, {
        name: title,
        altText,
        caption,
        description,
      });
      success('Media updated', 'Changes saved successfully.');
      setItem((prev) => (prev ? { ...prev, name: title, altText, caption, description } : prev));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      showError('Error', message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleting(true);
    try {
      await del(`/media/${id}`);
      success('Media deleted', 'The file has been permanently removed.');
      router.push('/admin/media');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      showError('Error', message);
      setDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  // ─── Utility handlers ───────────────────────────────────────────────────
  const handleCopyUrl = () => {
    if (item) {
      navigator.clipboard.writeText(item.url).then(() => {
        success('Copied', 'URL copied to clipboard.');
      });
    }
  };

  const handleDownload = () => {
    if (item) {
      const a = document.createElement('a');
      a.href = item.url;
      a.download = item.name;
      a.click();
    }
  };

  const hasUnsavedChanges = React.useMemo(() => {
    if (!item) return false;
    return (
      title !== item.name ||
      altText !== (item.altText || '') ||
      caption !== (item.caption || '') ||
      description !== (item.description || '')
    );
  }, [item, title, altText, caption, description]);

  // ─── Loading State ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen">
        {/* Header skeleton */}
        <div className="bg-background border-b px-6 py-4">
          <div className="flex items-center gap-4">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-64" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        {/* Content skeleton */}
        <div className="grid gap-8 p-6 lg:grid-cols-5">
          <div className="space-y-4 lg:col-span-3">
            <Skeleton className="aspect-video w-full rounded-lg" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
          <div className="space-y-4 lg:col-span-2">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-32 w-full rounded-lg" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────
  if (fetchError || !item) {
    return (
      <div className="flex min-h-[500px] flex-col items-center justify-center p-6 text-center">
        <div className="bg-destructive/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
          <AlertCircle className="text-destructive h-8 w-8" />
        </div>
        <h2 className="text-lg font-semibold">Media not found</h2>
        <p className="text-muted-foreground mt-1 max-w-md text-sm">
          {fetchError ||
            'This media file could not be loaded. It may have been deleted or you may not have permission to view it.'}
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" onClick={() => router.push('/admin/media')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Media Library
          </Button>
          <Button variant="default" onClick={() => window.location.reload()}>
            <Loader2 className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  const mediaType = getMediaIcon(item.mimeType);
  const isImage = item.mimeType.startsWith('image/');
  const isVideo = item.mimeType.startsWith('video/');
  const isAudio = item.mimeType.startsWith('audio/');

  // ─── Main Render ────────────────────────────────────────────────────────
  return (
    <div className="bg-background min-h-screen">
      {/* ── WordPress-style Header ───────────────────────────────────── */}
      <div className="bg-background border-b">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground gap-1.5"
              onClick={() => router.push('/admin/media')}
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div>
              <h1 className="text-lg font-semibold leading-tight">{item.name}</h1>
              <p className="text-muted-foreground text-xs">Media ID: {id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnsavedChanges && (
              <span className="text-muted-foreground hidden text-xs md:inline">
                Unsaved changes
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download className="mr-1.5 h-4 w-4" />
              Download
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.open(item.url, '_blank')}>
              <ExternalLink className="mr-1.5 h-4 w-4" />
              View
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setShowDeleteDialog(true)}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content area (WordPress two-column layout) ───────────────── */}
      <div className="grid gap-8 p-6 lg:grid-cols-5">
        {/* ── LEFT COLUMN: Preview + Edit form (3/5) ─────────────────── */}
        <div className="space-y-6 lg:col-span-3">
          {/* Media Preview */}
          <div className="bg-muted/30 overflow-hidden rounded-lg border">
            <div className="flex items-center justify-center bg-black/5 p-4 dark:bg-white/5">
              {isImage ? (
                <img
                  src={item.url}
                  alt={item.altText || item.name}
                  className="max-h-[60vh] w-full rounded object-contain"
                />
              ) : isVideo ? (
                <video src={item.url} controls className="max-h-[60vh] w-full rounded">
                  Your browser does not support the video tag.
                </video>
              ) : isAudio ? (
                <div className="flex flex-col items-center gap-6 py-12">
                  <div className="bg-muted flex h-24 w-24 items-center justify-center rounded-full">
                    <Music className="text-muted-foreground h-12 w-12" />
                  </div>
                  <audio src={item.url} controls className="w-full max-w-md">
                    Your browser does not support the audio tag.
                  </audio>
                  <p className="text-muted-foreground text-sm">{item.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4 py-16">
                  <div className="bg-muted flex h-24 w-24 items-center justify-center rounded-full">
                    <FileText className="text-muted-foreground h-12 w-12" />
                  </div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <Badge variant="secondary">{item.mimeType}</Badge>
                </div>
              )}
            </div>
          </div>

          {/* URL bar */}
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
              File URL
            </Label>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 truncate rounded border px-3 py-2 text-xs">
                {item.url}
              </code>
              <Button variant="outline" size="sm" className="h-9 shrink-0" onClick={handleCopyUrl}>
                <Copy className="mr-1.5 h-3.5 w-3.5" />
                Copy
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={() => window.open(item.url, '_blank')}
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Edit Form */}
          <div className="rounded-lg border p-5">
            <div className="mb-4 flex items-center gap-2">
              <Type className="text-muted-foreground h-4 w-4" />
              <h2 className="text-sm font-semibold">Attachment Details</h2>
            </div>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="edit-title">Title</Label>
                <Input
                  id="edit-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Media title"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-caption">Caption</Label>
                <Input
                  id="edit-caption"
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Add a caption for this media"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-alt">Alt Text</Label>
                <Input
                  id="edit-alt"
                  value={altText}
                  onChange={(e) => setAltText(e.target.value)}
                  placeholder="Describe the image for accessibility"
                />
                <p className="text-muted-foreground text-xs">
                  Alt text is used by screen readers and search engines to describe the content of
                  images.
                </p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  className="min-h-[100px]"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ── RIGHT SIDEBAR: File Info + Actions (2/5) ───────────────── */}
        <div className="space-y-6 lg:col-span-2">
          {/* Save / Publish box */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Save</h3>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full"
                onClick={handleSave}
                disabled={saving || !hasUnsavedChanges}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </>
                )}
              </Button>
              {!hasUnsavedChanges && (
                <p className="text-muted-foreground text-center text-xs">No changes to save</p>
              )}
            </div>
          </div>

          {/* File Info card */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-4 text-sm font-semibold">File Info</h3>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between border-b pb-2">
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <FileIcon className="h-3.5 w-3.5" />
                  File name
                </dt>
                <dd className="max-w-[160px] truncate text-right font-medium">{item.name}</dd>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <dt className="text-muted-foreground">File type</dt>
                <dd>
                  <Badge variant={getTypeBadgeVariant(item.mimeType)}>
                    {getTypeLabel(item.mimeType)}
                  </Badge>
                </dd>
              </div>
              <div className="flex items-center justify-between border-b pb-2">
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <HardDrive className="h-3.5 w-3.5" />
                  File size
                </dt>
                <dd className="font-medium">{formatBytes(item.size)}</dd>
              </div>
              {item.width && item.height && (
                <div className="flex items-center justify-between border-b pb-2">
                  <dt className="text-muted-foreground flex items-center gap-1.5">
                    <Maximize2 className="h-3.5 w-3.5" />
                    Dimensions
                  </dt>
                  <dd className="font-medium">
                    {item.width} × {item.height}
                  </dd>
                </div>
              )}
              <div className="flex items-center justify-between border-b pb-2">
                <dt className="text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Uploaded
                </dt>
                <dd className="font-medium">{formatDate(item.createdAt, { dateStyle: 'long' })}</dd>
              </div>
              {item.updatedAt && (
                <div className="flex items-center justify-between">
                  <dt className="text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    Last modified
                  </dt>
                  <dd className="font-medium">
                    {formatDate(item.updatedAt, { dateStyle: 'long' })}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Attached to Post card */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 text-sm font-semibold">Attached to Post</h3>
            <div className="bg-muted/50 flex items-center gap-3 rounded-md border p-3">
              <div className="text-muted-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-medium">Not attached</p>
                <p className="text-muted-foreground text-xs">
                  This media file is not currently attached to any post.
                </p>
              </div>
            </div>
          </div>

          {/* Delete card */}
          <div className="rounded-lg border border-red-200 p-4 dark:border-red-900">
            <h3 className="mb-2 text-sm font-semibold text-red-600 dark:text-red-400">
              Danger Zone
            </h3>
            <p className="text-muted-foreground mb-3 text-xs">
              Once you delete a media file, it is permanently removed. This action cannot be undone.
            </p>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => setShowDeleteDialog(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Permanently
            </Button>
          </div>
        </div>
      </div>

      {/* ── Delete Confirmation Dialog ──────────────────────────────────── */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="text-foreground font-medium">{item.name}</span>? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="bg-muted flex items-center gap-3 rounded-md p-3">
            {isImage ? (
              <img src={item.url} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="text-muted-foreground bg-background flex h-12 w-12 items-center justify-center rounded">
                {mediaType.icon}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{item.name}</p>
              <p className="text-muted-foreground text-xs">
                {formatBytes(item.size)} &middot;{' '}
                {item.width && item.height
                  ? `${item.width} × ${item.height}`
                  : getTypeLabel(item.mimeType)}
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              disabled={deleting}
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" disabled={deleting} onClick={handleDelete}>
              {deleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
