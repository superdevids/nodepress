'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Download,
  Trash2,
  ExternalLink,
  Loader2,
  AlertCircle,
  Copy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useParams } from 'next/navigation';
import { formatDate, formatBytes } from '@/lib/utils';
import { useToast } from '@/components/ui/toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useApi } from '@/lib/use-api';

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

  React.useEffect(() => {
    setLoading(true);
    setFetchError(null);
    get<MediaDetail>(`/media/${id}`)
      .then((res) => {
        const media = res.data;
        setItem(media);
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

  const handleSave = async () => {
    if (!item) return;
    setSaving(true);
    try {
      await patch(`/media/${id}`, { altText, caption, description });
      success('Media updated', 'Changes saved successfully.');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save';
      showError('Error', message);
    } finally {
      setSaving(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fetchError || !item) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="text-destructive font-medium">Failed to load media</p>
        <p className="text-muted-foreground mt-1 text-sm">{fetchError || 'Media not found'}</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-4"
          onClick={() => router.push('/admin/media')}
        >
          Back to Media Library
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.push('/admin/media')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{item.name}</h1>
            <p className="text-muted-foreground text-sm">Media ID: {id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload}>
            <Download className="mr-1.5 h-4 w-4" />
            Download
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.open(item.url, '_blank')}>
            <ExternalLink className="mr-1.5 h-4 w-4" />
            View
          </Button>
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-1.5 h-4 w-4" />
                Delete
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Media</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete &ldquo;{item.name}&rdquo;? This action cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
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
                    'Delete'
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden rounded-lg">
            {item.mimeType.startsWith('image/') ? (
              <img
                src={item.url}
                alt={item.altText || item.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="text-muted-foreground flex flex-col items-center gap-2">
                <AlertCircle className="h-10 w-10" />
                <span className="text-sm">{item.mimeType}</span>
              </div>
            )}
          </div>

          <div className="mt-4 space-y-1.5">
            <Label>URL</Label>
            <div className="flex items-center gap-2">
              <code className="bg-muted flex-1 truncate rounded px-2 py-1.5 text-xs">
                {item.url}
              </code>
              <Button variant="ghost" size="sm" className="h-7" onClick={handleCopyUrl}>
                <Copy className="mr-1 h-3.5 w-3.5" />
                Copy
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="alt-text">Alt Text</Label>
            <Input
              id="alt-text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for accessibility"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="caption">Caption</Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Optional caption"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="min-h-[100px]"
            />
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File name</span>
              <span>{item.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File type</span>
              <Badge variant="outline">{item.mimeType}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File size</span>
              <span>{formatBytes(item.size)}</span>
            </div>
            {item.width && item.height && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensions</span>
                <span>
                  {item.width} x {item.height}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uploaded on</span>
              <span>{formatDate(item.createdAt)}</span>
            </div>
          </div>

          <Button className="w-full" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
