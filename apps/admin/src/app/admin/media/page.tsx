'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Grid3X3,
  List,
  Upload,
  X,
  Image,
  FileVideo,
  FileAudio,
  FileText,
  File,
  Trash2,
  Download,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckSquare,
  Square,
  ChevronDown,
  Calendar,
  Filter,
  Save,
  Copy,
  MoreHorizontal,
  Edit3,
  Eye,
  ImageIcon,
  Music,
  Video,
  FileIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
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
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MediaUpload } from '@/components/media/media-upload';
import { formatDate, formatBytes } from '@/lib/utils';
import { useApi } from '@/lib/use-api';
import { useToast } from '@/components/ui/toast';

// ─── Types ───────────────────────────────────────────────────────────────────
interface MediaItem {
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
  createdAt: Date;
  updatedAt?: string;
}

type ViewMode = 'grid' | 'list';
type TypeFilter = 'all' | 'image' | 'video' | 'audio' | 'document';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getMediaIcon(mimeType: string): React.ReactNode {
  if (mimeType.startsWith('image/')) return <ImageIcon className="h-8 w-8" />;
  if (mimeType.startsWith('video/')) return <Video className="h-8 w-8" />;
  if (mimeType.startsWith('audio/')) return <Music className="h-8 w-8" />;
  if (mimeType.startsWith('application/pdf') || mimeType.startsWith('text/'))
    return <FileText className="h-8 w-8" />;
  return <FileIcon className="h-8 w-8" />;
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

function getTypeBadgeVariant(
  mimeType: string,
): 'default' | 'secondary' | 'info' | 'warning' | 'success' {
  if (mimeType.startsWith('image/')) return 'success';
  if (mimeType.startsWith('video/')) return 'info';
  if (mimeType.startsWith('audio/')) return 'warning';
  return 'secondary';
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function MediaPage() {
  const router = useRouter();
  const { get, patch, del } = useApi();
  const { success, error: showError } = useToast();

  const [mediaItems, setMediaItems] = React.useState<MediaItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);

  const [search, setSearch] = React.useState('');
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  const [typeFilter, setTypeFilter] = React.useState<TypeFilter>('all');
  const [dateFilter, setDateFilter] = React.useState<string>('all');
  const [viewMode, setViewMode] = React.useState<ViewMode>('grid');
  const [bulkMode, setBulkMode] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [showUpload, setShowUpload] = React.useState(false);

  // Detail modal state
  const [detailItem, setDetailItem] = React.useState<MediaItem | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editAlt, setEditAlt] = React.useState('');
  const [editCaption, setEditCaption] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [saving, setSaving] = React.useState(false);

  // Delete dialog state
  const [deleteItem, setDeleteItem] = React.useState<MediaItem | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  // Bulk delete
  const [showBulkDelete, setShowBulkDelete] = React.useState(false);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);

  const searchTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Debounced Search ────────────────────────────────────────────────────
  React.useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search]);

  // ─── Fetch Media ─────────────────────────────────────────────────────────
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

  // ─── Compute date filter options ─────────────────────────────────────────
  const dateOptions = React.useMemo(() => {
    const months: Record<string, string> = {};
    for (const item of mediaItems) {
      const d = new Date(item.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
      });
      if (!months[key]) months[key] = label;
    }
    return Object.entries(months).sort(([a], [b]) => b.localeCompare(a));
  }, [mediaItems]);

  // ─── Filtering & Sorting ─────────────────────────────────────────────────
  const filtered = React.useMemo(() => {
    return mediaItems
      .filter((item) => {
        // Search filter
        if (debouncedSearch && !item.name.toLowerCase().includes(debouncedSearch.toLowerCase()))
          return false;

        // Type filter
        if (typeFilter !== 'all') {
          const typeGroup = item.mimeType.split('/')[0] ?? '';
          if (typeFilter === 'image' && typeGroup !== 'image') return false;
          if (typeFilter === 'video' && typeGroup !== 'video') return false;
          if (typeFilter === 'audio' && typeGroup !== 'audio') return false;
          if (typeFilter === 'document' && !['application', 'text'].includes(typeGroup))
            return false;
        }

        // Date filter
        if (dateFilter !== 'all') {
          const d = new Date(item.createdAt);
          const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          if (key !== dateFilter) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt).getTime();
        const dateB = new Date(b.createdAt).getTime();
        return dateB - dateA; // newest first
      });
  }, [mediaItems, debouncedSearch, typeFilter, dateFilter]);

  // ─── Selection handlers ──────────────────────────────────────────────────
  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id]));
  };

  const selectAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map((f) => f.id));
    }
  };

  const clearSelection = () => {
    setSelected([]);
    setBulkMode(false);
  };

  // ─── Detail modal handlers ───────────────────────────────────────────────
  const openDetail = (item: MediaItem) => {
    setDetailItem(item);
    setEditTitle(item.name);
    setEditAlt(item.altText || '');
    setEditCaption(item.caption || '');
    setEditDescription(item.description || '');
  };

  const handleSaveDetail = async () => {
    if (!detailItem) return;
    setSaving(true);
    try {
      await patch(`/api/media/${detailItem.id}`, {
        name: editTitle,
        altText: editAlt,
        caption: editCaption,
        description: editDescription,
      });
      success('Media updated', 'Changes saved successfully.');
      setDetailItem(null);
      await fetchMedia();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to save media';
      showError('Error', message);
    } finally {
      setSaving(false);
    }
  };

  // ─── Delete handlers ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await del(`/api/media/${deleteItem.id}`);
      success('Media deleted', `${deleteItem.name} has been deleted.`);
      setDeleteItem(null);
      if (detailItem?.id === deleteItem.id) setDetailItem(null);
      await fetchMedia();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete media';
      showError('Error', message);
    } finally {
      setDeleting(false);
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    try {
      for (const id of selected) {
        await del(`/api/media/${id}`);
      }
      success('Media deleted', `${selected.length} file(s) have been deleted.`);
      setShowBulkDelete(false);
      setSelected([]);
      setBulkMode(false);
      await fetchMedia();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete media';
      showError('Error', message);
    } finally {
      setBulkDeleting(false);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url).then(() => {
      success('Copied', 'URL copied to clipboard.');
    });
  };

  const handleDownload = (item: MediaItem) => {
    const a = document.createElement('a');
    a.href = item.url;
    a.download = item.name;
    a.click();
  };

  // ─── Upload complete handler ─────────────────────────────────────────────
  const handleUploadComplete = () => {
    setShowUpload(false);
    fetchMedia();
  };

  // ─── Render helper: Grid item ────────────────────────────────────────────
  const renderGridItem = (item: MediaItem) => {
    const isSelected = selected.includes(item.id);
    const isImage = item.mimeType.startsWith('image/');
    const showCheck = bulkMode || isSelected;

    return (
      <div
        key={item.id}
        className={`bg-card group relative cursor-pointer overflow-hidden rounded-lg border transition-all hover:shadow-md ${
          isSelected ? 'ring-primary ring-2' : ''
        }`}
        onClick={() => {
          if (bulkMode) {
            toggleSelect(item.id);
          } else {
            openDetail(item);
          }
        }}
      >
        {/* Thumbnail area */}
        <div className="bg-muted relative flex aspect-square items-center justify-center overflow-hidden">
          {isImage ? (
            <img
              src={item.url}
              alt={item.altText || item.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="text-muted-foreground flex flex-col items-center gap-2">
              {getMediaIcon(item.mimeType)}
              <span className="text-[10px] font-medium">{getTypeLabel(item.mimeType)}</span>
            </div>
          )}

          {/* File size overlay on hover */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent px-2 pb-1.5 pt-6 opacity-0 transition-opacity group-hover:opacity-100">
            <span className="text-[10px] font-medium text-white">{formatBytes(item.size)}</span>
            <span className="text-[10px] text-white/80">
              {item.width && item.height ? `${item.width}×${item.height}` : ''}
            </span>
          </div>

          {/* Checkbox (visible in bulk mode or on hover) */}
          <div
            className={`absolute left-2 top-2 z-10 transition-all ${
              showCheck ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              toggleSelect(item.id);
            }}
          >
            <Checkbox
              checked={isSelected}
              className="data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground h-4 w-4 border-white/80 bg-white/30"
            />
          </div>

          {/* Action buttons on hover */}
          <div
            className="absolute right-2 top-2 z-10 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              variant="secondary"
              size="icon"
              className="h-7 w-7 bg-black/40 text-white hover:bg-black/60"
              onClick={() => openDetail(item)}
            >
              <Eye className="h-3.5 w-3.5" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-7 w-7 bg-black/40 text-white hover:bg-black/60"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => openDetail(item)}>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload(item)}>
                  <Download className="mr-2 h-4 w-4" /> Download
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleCopyUrl(item.url)}>
                  <Copy className="mr-2 h-4 w-4" /> Copy URL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => window.open(item.url, '_blank')}>
                  <ExternalLink className="mr-2 h-4 w-4" /> View
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-destructive" onClick={() => setDeleteItem(item)}>
                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Info below thumbnail */}
        <div className="space-y-0.5 p-2">
          <p className="truncate text-xs font-medium">{item.name}</p>
          <div className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
            <Badge
              variant={getTypeBadgeVariant(item.mimeType)}
              className="h-auto px-1 py-0 text-[10px]"
            >
              {getTypeLabel(item.mimeType)}
            </Badge>
            <span>{formatDate(item.createdAt, { dateStyle: 'short' })}</span>
          </div>
        </div>
      </div>
    );
  };

  // ─── Render helper: List item ────────────────────────────────────────────
  const renderListItem = (item: MediaItem) => {
    const isSelected = selected.includes(item.id);
    const isImage = item.mimeType.startsWith('image/');

    return (
      <TableRow
        key={item.id}
        className={`cursor-pointer transition-colors ${isSelected ? 'bg-muted/50' : ''}`}
        onClick={() => {
          if (bulkMode) {
            toggleSelect(item.id);
          } else {
            openDetail(item);
          }
        }}
      >
        <TableCell className="w-10 p-3" onClick={(e) => e.stopPropagation()}>
          {(bulkMode || isSelected) && (
            <Checkbox checked={isSelected} onCheckedChange={() => toggleSelect(item.id)} />
          )}
        </TableCell>
        <TableCell className="p-3">
          <div className="flex items-center gap-3">
            <div className="bg-muted flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded">
              {isImage ? (
                <img
                  src={item.url}
                  alt={item.altText || item.name}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="text-muted-foreground">{getMediaIcon(item.mimeType)}</div>
              )}
            </div>
            <div className="min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  openDetail(item);
                }}
                className="hover:text-primary truncate text-left text-sm font-medium transition-colors"
              >
                {item.name}
              </button>
              <p className="text-muted-foreground text-xs">{formatBytes(item.size)}</p>
            </div>
          </div>
        </TableCell>
        <TableCell className="hidden p-3 sm:table-cell">
          <Badge variant={getTypeBadgeVariant(item.mimeType)} className="text-xs">
            {getTypeLabel(item.mimeType)}
          </Badge>
        </TableCell>
        <TableCell className="text-muted-foreground hidden p-3 md:table-cell">Admin</TableCell>
        <TableCell className="text-muted-foreground hidden p-3 lg:table-cell">
          {formatDate(item.createdAt, { dateStyle: 'medium' })}
        </TableCell>
        <TableCell className="text-muted-foreground hidden p-3 lg:table-cell">
          {item.width && item.height ? `${item.width} × ${item.height}` : '—'}
        </TableCell>
        <TableCell className="w-10 p-3" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openDetail(item)}>
                <Edit3 className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleDownload(item)}>
                <Download className="mr-2 h-4 w-4" /> Download
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleCopyUrl(item.url)}>
                <Copy className="mr-2 h-4 w-4" /> Copy URL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => setDeleteItem(item)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </TableCell>
      </TableRow>
    );
  };

  // ─── Loading skeletons ───────────────────────────────────────────────────
  const renderSkeletons = () => (
    <>
      {/* Filter bar skeleton */}
      <div className="flex flex-wrap items-center gap-3">
        <Skeleton className="h-10 w-[200px]" />
        <Skeleton className="h-10 w-[130px]" />
        <Skeleton className="h-10 w-[160px]" />
        <Skeleton className="ml-auto h-10 w-[100px]" />
      </div>

      {/* Grid skeletons */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="aspect-square w-full rounded-lg" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2 w-1/2" />
          </div>
        ))}
      </div>
    </>
  );

  // ─── Error state ─────────────────────────────────────────────────────────
  const renderError = () => (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <div className="bg-destructive/10 mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <AlertCircle className="text-destructive h-8 w-8" />
      </div>
      <h3 className="text-lg font-semibold">Failed to load media</h3>
      <p className="text-muted-foreground mt-1 max-w-md text-sm">
        {fetchError || 'An unexpected error occurred. Please try again.'}
      </p>
      <Button variant="outline" className="mt-6" onClick={fetchMedia}>
        <Loader2 className="mr-2 h-4 w-4" /> Try Again
      </Button>
    </div>
  );

  // ─── Empty state ─────────────────────────────────────────────────────────
  const renderEmpty = () => (
    <div className="flex min-h-[400px] flex-col items-center justify-center text-center">
      <div className="bg-muted mb-4 flex h-20 w-20 items-center justify-center rounded-full">
        <ImageIcon className="text-muted-foreground h-10 w-10" />
      </div>
      <h3 className="text-lg font-semibold">No media found</h3>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {debouncedSearch || typeFilter !== 'all' || dateFilter !== 'all'
          ? 'Try adjusting your search or filter criteria.'
          : 'Upload your first media file to get started.'}
      </p>
      {!debouncedSearch && typeFilter === 'all' && dateFilter === 'all' && (
        <Button className="mt-6" onClick={() => setShowUpload(true)}>
          <Upload className="mr-2 h-4 w-4" /> Upload Your First File
        </Button>
      )}
    </div>
  );

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen">
      {/* ── Page Header (NodePress-style) ─────────────────────────────── */}
      <div className="bg-background border-b">
        <div className="flex flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Upload, browse, and manage your media files.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {bulkMode && selected.length > 0 && (
              <>
                <span className="text-muted-foreground whitespace-nowrap text-sm">
                  {selected.length} selected
                </span>
                <Button variant="destructive" size="sm" onClick={() => setShowBulkDelete(true)}>
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete Selected
                </Button>
              </>
            )}
            <Button
              variant={bulkMode ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => {
                setBulkMode(!bulkMode);
                if (bulkMode) setSelected([]);
              }}
            >
              {bulkMode ? (
                <>
                  <Square className="mr-1.5 h-4 w-4" /> Exit Bulk Select
                </>
              ) : (
                <>
                  <CheckSquare className="mr-1.5 h-4 w-4" /> Bulk Select
                </>
              )}
            </Button>
            <Button
              variant={showUpload ? 'secondary' : 'default'}
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              {showUpload ? 'Close Upload' : 'Add New Media File'}
            </Button>
          </div>
        </div>

        {/* ── Collapsible Upload Panel ────────────────────────────────── */}
        {showUpload && (
          <div className="bg-muted/30 border-t px-6 py-4">
            <div className="mx-auto max-w-2xl">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Upload New Media</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setShowUpload(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <MediaUpload onUploadComplete={handleUploadComplete} />
            </div>
          </div>
        )}

        {/* ── Filter Bar ──────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 border-t px-6 py-3">
          {/* Search */}
          <div className="relative min-w-[180px] flex-1 sm:max-w-xs">
            <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
            <Input
              placeholder="Search media items..."
              className="h-9 pl-8 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                className="text-muted-foreground absolute right-2 top-1/2 -translate-y-1/2"
                onClick={() => setSearch('')}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Type filter */}
          <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TypeFilter)}>
            <SelectTrigger className="h-9 w-[130px] text-sm">
              <Filter className="mr-2 h-3.5 w-3.5" />
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

          {/* Date filter */}
          <Select value={dateFilter} onValueChange={setDateFilter}>
            <SelectTrigger className="h-9 w-[170px] text-sm">
              <Calendar className="mr-2 h-3.5 w-3.5" />
              <SelectValue placeholder="Filter by date" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Dates</SelectItem>
              {dateOptions.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View mode toggle */}
          <div className="flex items-center rounded-md border">
            <Button
              variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-none rounded-l-md"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-9 w-9 rounded-none rounded-r-md"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Content Area ──────────────────────────────────────────────── */}
      <div className="p-6">
        {loading ? (
          renderSkeletons()
        ) : fetchError ? (
          renderError()
        ) : filtered.length === 0 ? (
          renderEmpty()
        ) : (
          <>
            {/* Bulk select bar */}
            {bulkMode && (
              <div className="bg-muted/50 mb-4 flex items-center justify-between rounded-lg border px-4 py-2.5">
                <div className="flex items-center gap-3">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={selectAll}>
                    {selected.length === filtered.length ? 'Deselect All' : 'Select All'}
                  </Button>
                  <span className="text-muted-foreground text-xs">
                    {selected.length} of {filtered.length} selected
                  </span>
                </div>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearSelection}>
                  Clear Selection
                </Button>
              </div>
            )}

            {/* Grid View */}
            {viewMode === 'grid' && (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {filtered.map(renderGridItem)}
              </div>
            )}

            {/* List View */}
            {viewMode === 'list' && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 p-3">
                        {bulkMode && (
                          <Checkbox
                            checked={filtered.length > 0 && selected.length === filtered.length}
                            onCheckedChange={selectAll}
                          />
                        )}
                      </TableHead>
                      <TableHead className="p-3">File</TableHead>
                      <TableHead className="hidden p-3 sm:table-cell">Type</TableHead>
                      <TableHead className="hidden p-3 md:table-cell">Author</TableHead>
                      <TableHead className="hidden p-3 lg:table-cell">Uploaded</TableHead>
                      <TableHead className="hidden p-3 lg:table-cell">Dimensions</TableHead>
                      <TableHead className="w-10 p-3" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>{filtered.map(renderListItem)}</TableBody>
                </Table>
              </div>
            )}

            {/* Footer stats */}
            <div className="text-muted-foreground mt-4 flex items-center justify-between text-sm">
              <span>
                Showing {filtered.length} of {mediaItems.length} media items
              </span>
            </div>
          </>
        )}
      </div>

      {/* ── Media Detail Modal ──────────────────────────────────────────── */}
      <Dialog
        open={!!detailItem}
        onOpenChange={(open) => {
          if (!open) setDetailItem(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          {detailItem && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Media</DialogTitle>
                <DialogDescription>Update media details and metadata.</DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 py-4 lg:grid-cols-5">
                {/* Preview — takes 3 cols */}
                <div className="lg:col-span-3 lg:border-r lg:pr-6">
                  {/* Preview */}
                  <div className="bg-muted flex aspect-video items-center justify-center overflow-hidden rounded-lg">
                    {detailItem.mimeType.startsWith('image/') ? (
                      <img
                        src={detailItem.url}
                        alt={detailItem.altText || detailItem.name}
                        className="h-full w-full object-contain"
                      />
                    ) : detailItem.mimeType.startsWith('video/') ? (
                      <video src={detailItem.url} controls className="h-full w-full" />
                    ) : detailItem.mimeType.startsWith('audio/') ? (
                      <div className="flex flex-col items-center gap-4 p-8">
                        <Music className="text-muted-foreground h-16 w-16" />
                        <audio src={detailItem.url} controls className="w-full max-w-sm" />
                      </div>
                    ) : (
                      <div className="text-muted-foreground flex flex-col items-center gap-3 p-8">
                        <FileText className="h-16 w-16" />
                        <span className="text-sm font-medium">{detailItem.mimeType}</span>
                      </div>
                    )}
                  </div>

                  {/* URL */}
                  <div className="mt-4 space-y-1.5">
                    <Label className="text-muted-foreground text-xs font-medium uppercase tracking-wider">
                      File URL
                    </Label>
                    <div className="flex items-center gap-2">
                      <code className="bg-muted flex-1 truncate rounded px-2 py-1.5 text-xs">
                        {detailItem.url}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 shrink-0"
                        onClick={() => handleCopyUrl(detailItem.url)}
                      >
                        <Copy className="mr-1 h-3.5 w-3.5" />
                        Copy
                      </Button>
                    </div>
                  </div>

                  {/* Expandable attachment details */}
                  <div className="mt-4 rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-semibold">Attachment Details</h4>

                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="detail-title">Title</Label>
                        <Input
                          id="detail-title"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          placeholder="Media title"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="detail-caption">Caption</Label>
                        <Input
                          id="detail-caption"
                          value={editCaption}
                          onChange={(e) => setEditCaption(e.target.value)}
                          placeholder="Add a caption"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="detail-alt">Alt Text</Label>
                        <Input
                          id="detail-alt"
                          value={editAlt}
                          onChange={(e) => setEditAlt(e.target.value)}
                          placeholder="Describe the image for accessibility"
                        />
                        <p className="text-muted-foreground text-xs">
                          Alt text is used by screen readers and search engines.
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="detail-description">Description</Label>
                        <Textarea
                          id="detail-description"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Optional description"
                          className="min-h-[80px]"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar — takes 2 cols */}
                <div className="space-y-6 lg:col-span-2">
                  {/* File info */}
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-3 text-sm font-semibold">File Info</h4>
                    <dl className="space-y-2.5 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">File name</dt>
                        <dd className="truncate text-right font-medium">{detailItem.name}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">File type</dt>
                        <dd>
                          <Badge variant={getTypeBadgeVariant(detailItem.mimeType)}>
                            {getTypeLabel(detailItem.mimeType)}
                          </Badge>
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">MIME type</dt>
                        <dd className="text-xs">{detailItem.mimeType}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">File size</dt>
                        <dd className="font-medium">{formatBytes(detailItem.size)}</dd>
                      </div>
                      {detailItem.width && detailItem.height && (
                        <div className="flex justify-between">
                          <dt className="text-muted-foreground">Dimensions</dt>
                          <dd className="font-medium">
                            {detailItem.width} × {detailItem.height}
                          </dd>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Uploaded on</dt>
                        <dd className="font-medium">
                          {formatDate(detailItem.createdAt, {
                            dateStyle: 'long',
                          })}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Attach to post */}
                  <div className="rounded-lg border p-4">
                    <h4 className="mb-2 text-sm font-semibold">Attached to Post</h4>
                    <p className="text-muted-foreground text-xs">
                      This media file is not currently attached to any post.
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    <Button className="w-full" onClick={handleSaveDetail} disabled={saving}>
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
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleDownload(detailItem)}
                    >
                      <Download className="mr-2 h-4 w-4" /> Download File
                    </Button>
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => {
                        setDeleteItem(detailItem);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" /> Delete Permanently
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Single Delete Confirmation ──────────────────────────────────── */}
      <Dialog
        open={!!deleteItem && !showBulkDelete}
        onOpenChange={(open) => {
          if (!open) setDeleteItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{' '}
              <span className="text-foreground font-medium">{deleteItem?.name}</span>? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted flex items-center gap-3 rounded-md p-3">
            {deleteItem?.mimeType.startsWith('image/') ? (
              <img src={deleteItem?.url} alt="" className="h-12 w-12 rounded object-cover" />
            ) : (
              <div className="bg-background text-muted-foreground flex h-12 w-12 items-center justify-center rounded">
                {deleteItem && getMediaIcon(deleteItem.mimeType)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{deleteItem?.name}</p>
              <p className="text-muted-foreground text-xs">
                {deleteItem && formatBytes(deleteItem.size)}
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteItem(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
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

      {/* ── Bulk Delete Confirmation ────────────────────────────────────── */}
      <Dialog open={showBulkDelete} onOpenChange={setShowBulkDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selected.length} Media Files</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete these {selected.length} files? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-muted max-h-[200px] overflow-y-auto rounded-md p-3">
            {mediaItems
              .filter((m) => selected.includes(m.id))
              .map((m) => (
                <div key={m.id} className="flex items-center gap-2 py-1 text-sm">
                  <div className="bg-background text-muted-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px]">
                    {m.mimeType.startsWith('image/') ? (
                      <ImageIcon className="h-3.5 w-3.5" />
                    ) : (
                      <FileIcon className="h-3.5 w-3.5" />
                    )}
                  </div>
                  <span className="truncate">{m.name}</span>
                  <span className="text-muted-foreground ml-auto text-xs">
                    {formatBytes(m.size)}
                  </span>
                </div>
              ))}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowBulkDelete(false)}
              disabled={bulkDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleBulkDelete} disabled={bulkDeleting}>
              {bulkDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Deleting...
                </>
              ) : (
                `Delete ${selected.length} Files`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
