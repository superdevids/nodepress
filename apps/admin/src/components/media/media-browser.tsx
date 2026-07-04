'use client';

import * as React from 'react';
import {
  Search,
  Grid3X3,
  List,
  SlidersHorizontal,
  Upload,
  ArrowUpDown,
  Loader2,
  AlertCircle,
  FileText,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { MediaGrid } from './media-grid';
import { MediaUpload } from './media-upload';
import { ScreenOptions } from '@/components/admin/screen-options';
import { formatBytes } from '@/lib/utils';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/components/ui/toast';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  altText?: string;
  createdAt: Date;
  caption?: string;
  description?: string;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number };
}

type ViewMode = 'grid' | 'list';
type SortField = 'date' | 'name' | 'size';

export function MediaBrowser() {
  const { get, patch, del } = useApi();
  const { success, error: showError } = useToast();
  const [search, setSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState('all');
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [selected, setSelected] = React.useState<string[]>([]);
  const [showUpload, setShowUpload] = React.useState(false);
  const [sortField, setSortField] = React.useState<SortField>('date');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');
  const [editItem, setEditItem] = React.useState<MediaItem | null>(null);
  const [deleteItem, setDeleteItem] = React.useState<MediaItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const [mediaItems, setMediaItems] = React.useState<MediaItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editAlt, setEditAlt] = React.useState('');
  const [editCaption, setEditCaption] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [savingEdit, setSavingEdit] = React.useState(false);

  const fetchMedia = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get<MediaItem[]>('/api/media');
      setMediaItems(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load media';
      setFetchError(message);
      showError('Failed to load media', message);
    } finally {
      setLoading(false);
    }
  }, [get, showError]);

  React.useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  const filtered = mediaItems
    .filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== 'all') {
        const typeGroup = item.mimeType.split('/')[0] ?? '';
        if (typeFilter === 'image' && typeGroup !== 'image') return false;
        if (typeFilter === 'video' && typeGroup !== 'video') return false;
        if (typeFilter === 'audio' && typeGroup !== 'audio') return false;
        if (typeFilter === 'document' && !['application', 'text'].includes(typeGroup)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'size') cmp = a.size - b.size;
      else cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const handleSelect = (item: MediaItem) => {
    setSelected((prev) =>
      prev.includes(item.id) ? prev.filter((id) => id !== item.id) : [...prev, item.id],
    );
  };

  const openEdit = (item: MediaItem) => {
    setEditItem(item);
    setEditTitle(item.name);
    setEditAlt(item.altText || '');
    setEditCaption(item.caption || '');
    setEditDescription(item.description || '');
  };

  const handleSaveEdit = async () => {
    if (!editItem) return;
    setSavingEdit(true);
    try {
      await patch(`/api/media/${editItem.id}`, {
        name: editTitle,
        altText: editAlt,
        caption: editCaption,
        description: editDescription,
      });
      success('Media updated', 'Media details have been saved.');
      setEditItem(null);
      await fetchMedia();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save media';
      showError('Error', message);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await del(`/api/media/${deleteItem.id}`);
      success('Media deleted', `${deleteItem.name} has been deleted.`);
      setDeleteItem(null);
      await fetchMedia();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete media';
      showError('Error', message);
    } finally {
      setDeleting(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative min-w-[200px] max-w-sm flex-1">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search media..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={`${sortField}-${sortDir}`}
            onValueChange={(v) => {
              const [field, dir] = v.split('-') as [SortField, 'asc' | 'desc'];
              setSortField(field);
              setSortDir(dir);
            }}
          >
            <SelectTrigger className="w-36">
              <ArrowUpDown className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="size-desc">Largest First</SelectItem>
              <SelectItem value="size-asc">Smallest First</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center rounded-md border">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ScreenOptions
            columns={[
              { id: 'name', label: 'Name' },
              { id: 'type', label: 'Type' },
              { id: 'size', label: 'Size' },
              { id: 'date', label: 'Date' },
            ]}
          />
          <Button onClick={() => setShowUpload(!showUpload)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </div>
      </div>

      {showUpload && (
        <MediaUpload
          onUploadComplete={(files) => {
            setShowUpload(false);
            fetchMedia();
          }}
        />
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <AlertCircle className="text-destructive mb-3 h-10 w-10" />
          <p className="text-destructive font-medium">Failed to load media</p>
          <p className="text-muted-foreground mt-1 text-sm">{fetchError}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchMedia}>
            Try Again
          </Button>
        </div>
      ) : (
        <MediaGrid
          items={filtered}
          onSelect={handleSelect}
          selected={selected}
          viewMode={viewMode}
          onEdit={openEdit}
          onDelete={setDeleteItem}
        />
      )}

      {!loading && !fetchError && filtered.length === 0 && (
        <div className="text-muted-foreground py-12 text-center">
          <p>No media found</p>
        </div>
      )}

      {!loading && !fetchError && (
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>
            {filtered.length} of {mediaItems.length} items
          </span>
        </div>
      )}

      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>Update media details and metadata.</DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="grid gap-6 py-4">
              <div className="flex gap-6">
                <div className="bg-muted flex h-48 w-48 shrink-0 items-center justify-center overflow-hidden rounded-lg">
                  {editItem.mimeType.startsWith('image/') ? (
                    <img
                      src={editItem.url}
                      alt={editItem.altText || editItem.name}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <FileText className="text-muted-foreground h-12 w-12" />
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Title</label>
                    <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Alt Text</label>
                    <Input
                      value={editAlt}
                      onChange={(e) => setEditAlt(e.target.value)}
                      placeholder="Describe the image for accessibility"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Caption</label>
                    <Input
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      placeholder="Image caption"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="border-input bg-background flex min-h-[60px] w-full rounded-md border px-3 py-2 text-sm"
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">File size:</span>{' '}
                  {formatBytes(editItem.size)}
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span> {editItem.mimeType}
                </div>
                {editItem.width && editItem.height && (
                  <div>
                    <span className="text-muted-foreground">Dimensions:</span> {editItem.width} x{' '}
                    {editItem.height}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">Focal Point</label>
                <p className="text-muted-foreground text-xs">
                  Click to set the focal point for cropping.
                </p>
                <div className="bg-muted relative h-32 w-48 cursor-crosshair overflow-hidden rounded-md">
                  <img
                    src={editItem.url}
                    alt="Focal point selector"
                    className="h-full w-full object-cover"
                  />
                  {editItem.focalPoint && (
                    <div
                      className="bg-primary absolute h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                      style={{
                        left: `${editItem.focalPoint.x * 100}%`,
                        top: `${editItem.focalPoint.y * 100}%`,
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditItem(null)} disabled={savingEdit}>
                  Cancel
                </Button>
                <Button onClick={handleSaveEdit} disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteItem?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
