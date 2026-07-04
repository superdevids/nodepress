'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Plus,
  Search,
  Filter,
  AlertCircle,
  Loader2,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Eye,
  Trash2,
  Star,
  Lock,
  Grid3X3,
  List,
  WifiOff,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useApi, type ApiMeta } from '@/lib/use-api';
import { useToast } from '@/components/ui/toast';
import { useDebounce } from '@/lib/hooks';
import { formatDate, cn } from '@/lib/utils';

/* ── Types ────────────────────────────────────────────── */

interface ContentEntry {
  id: string;
  type: 'post' | 'page';
  title: string;
  slug: string;
  status: 'publish' | 'draft' | 'pending' | 'private' | 'trash';
  author: { id: string; name: string; email?: string };
  categories: { id: string; name: string; slug: string }[];
  tags: { id: string; name: string; slug: string }[];
  createdAt: string;
  modifiedAt: string;
  isSticky: boolean;
  isPasswordProtected: boolean;
  commentCount: number;
  excerpt: string;
}

/* ── Helpers ──────────────────────────────────────────── */

const statusConfig: Record<
  string,
  { label: string; variant: 'success' | 'secondary' | 'warning' | 'destructive' | 'default' }
> = {
  publish: { label: 'Published', variant: 'success' },
  draft: { label: 'Draft', variant: 'secondary' },
  pending: { label: 'Pending', variant: 'warning' },
  private: { label: 'Private', variant: 'default' },
  trash: { label: 'Trashed', variant: 'destructive' },
};

const typeLabel: Record<string, string> = {
  post: 'Posts',
  page: 'Pages',
};

/* ── Main Page ────────────────────────────────────────── */

export default function ContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { get, del, post } = useApi();
  const { success, error: showError } = useToast();

  // State
  const [items, setItems] = React.useState<ContentEntry[]>([]);
  const [meta, setMeta] = React.useState<ApiMeta | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [networkOffline, setNetworkOffline] = React.useState(false);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState(searchParams.get('search') || '');
  const [typeFilter, setTypeFilter] = React.useState<'post' | 'page'>(
    (searchParams.get('type') as 'post' | 'page') || 'post',
  );
  const [statusFilter, setStatusFilter] = React.useState(searchParams.get('status') || 'all');
  const [page, setPage] = React.useState(Number(searchParams.get('page')) || 1);
  const [viewMode, setViewMode] = React.useState<'list' | 'grid'>('list');
  const [bulkAction, setBulkAction] = React.useState('');
  const [showBulkConfirm, setShowBulkConfirm] = React.useState(false);
  const [bulkProcessing, setBulkProcessing] = React.useState(false);
  const [deleteItem, setDeleteItem] = React.useState<ContentEntry | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [isOnline, setIsOnline] = React.useState(true);

  const perPage = 20;
  const debouncedSearch = useDebounce(search, 300);

  // Track network status
  React.useEffect(() => {
    setIsOnline(navigator.onLine);
    const handleOnline = () => {
      setIsOnline(true);
      setNetworkOffline(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setNetworkOffline(true);
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  /* ── Data fetching ─────────────────────────────────── */

  const fetchContent = React.useCallback(async () => {
    if (!isOnline) {
      setNetworkOffline(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setFetchError(null);
    setNetworkOffline(false);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', String(perPage));
      if (statusFilter !== 'all') params.set('status', statusFilter);
      if (debouncedSearch) params.set('search', debouncedSearch);

      const res = await get<ContentEntry[]>(`/api/content/${typeFilter}?${params}`);
      setItems(res.data || []);
      setMeta(res.meta || null);
    } catch (err: unknown) {
      if (!navigator.onLine) {
        setNetworkOffline(true);
      } else {
        const message = err instanceof Error ? err.message : 'Failed to load content';
        setFetchError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [get, typeFilter, statusFilter, page, debouncedSearch, isOnline]);

  React.useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Update URL params
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (typeFilter !== 'post') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (debouncedSearch) params.set('search', debouncedSearch);
    const qs = params.toString();
    router.replace(`/admin/content${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [page, typeFilter, statusFilter, debouncedSearch, router]);

  /* ── Selection ─────────────────────────────────────── */

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === items.length && items.length > 0) {
      setSelected([]);
    } else {
      setSelected(items.map((f) => f.id));
    }
  };

  /* ── Bulk Actions ──────────────────────────────────── */

  const handleBulkAction = async () => {
    if (!bulkAction || selected.length === 0) return;
    if (bulkAction === 'trash' || bulkAction === 'delete') {
      setShowBulkConfirm(true);
      return;
    }
    await executeBulkAction();
  };

  const executeBulkAction = async () => {
    setBulkProcessing(true);
    try {
      await post('/api/content/bulk', { action: bulkAction, ids: selected });
      success(
        'Bulk action completed',
        `${selected.length} item(s) ${bulkAction === 'publish' ? 'published' : bulkAction === 'unpublish' ? 'unpublished' : bulkAction === 'draft' ? 'moved to draft' : bulkAction === 'trash' ? 'trashed' : 'processed'}.`,
      );
      setSelected([]);
      setBulkAction('');
      setShowBulkConfirm(false);
      await fetchContent();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Bulk action failed';
      showError('Action failed', message);
    } finally {
      setBulkProcessing(false);
    }
  };

  /* ── Single Delete ─────────────────────────────────── */

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await del(`/api/content/${deleteItem.type}/${deleteItem.id}`);
      success('Deleted', `"${deleteItem.title}" has been moved to trash.`);
      setDeleteItem(null);
      await fetchContent();
    } catch (err: unknown) {
      showError('Delete failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  /* ── Status counts for tabs ────────────────────────── */

  const totalPages = meta ? meta.totalPages : 1;

  /* ── Render states ─────────────────────────────────── */

  /**
   * NETWORK OFFLINE state
   */
  if (networkOffline && items.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#c3c4c7] bg-white p-6 text-center">
        <WifiOff className="mb-3 h-12 w-12 text-[#d63638]" />
        <h2 className="text-lg font-semibold text-[#1d2327]">No internet connection</h2>
        <p className="mt-1 max-w-sm text-sm text-[#646970]">
          You appear to be offline. Content will load once you&apos;re back online.
        </p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchContent}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Try Again
        </Button>
      </div>
    );
  }

  /**
   * LOADING state (initial load, no cached data)
   */
  if (loading && items.length === 0) {
    return (
      <div className="space-y-5">
        {/* Title skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-9 w-32" />
        </div>
        {/* Table skeleton */}
        <div className="rounded-lg border border-[#c3c4c7] bg-white">
          <div className="border-b border-[#c3c4c7] px-4 py-3">
            <div className="flex items-center gap-4">
              <Skeleton className="h-9 w-44" />
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-9 w-36" />
              <Skeleton className="ml-auto h-9 w-10" />
            </div>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="border-[#c3c4c7]">
                {['', 'Title', 'Author', 'Categories', 'Tags', 'Date'].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-[#c3c4c7]">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}>
                      <Skeleton className={cn('h-5', j === 0 ? 'w-4' : 'w-full')} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Pagination skeleton */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-9 w-20" />
          </div>
        </div>
      </div>
    );
  }

  /**
   * ERROR state
   */
  if (fetchError && items.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#c3c4c7] bg-white p-6 text-center">
        <AlertCircle className="mb-3 h-12 w-12 text-[#d63638]" />
        <h2 className="text-lg font-semibold text-[#1d2327]">Failed to load content</h2>
        <p className="mt-1 max-w-md text-sm text-[#646970]">{fetchError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchContent}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  /**
   * EMPTY state
   */
  const isEmpty = !loading && items.length === 0;

  /* ── Normal render ─────────────────────────────────── */

  return (
    <div className="space-y-0">
      {/* ============ NETWORK BANNER ============ */}
      {networkOffline && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-[#dba617] bg-[#fcf9e8] px-4 py-2.5 text-sm text-[#996800]">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>You are currently offline. Some features may be unavailable.</span>
          <Button
            variant="ghost"
            size="sm"
            className="ml-auto h-auto px-2 py-1 text-xs"
            onClick={fetchContent}
          >
            Retry
          </Button>
        </div>
      )}

      {/* ============ PAGE HEADER ============ */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-[#1d2327]">
            {typeFilter === 'post' ? 'Posts' : 'Pages'}
          </h1>
          <Link href={`/admin/content/${typeFilter}/new`}>
            <Button size="sm" className="h-8 gap-1">
              <Plus className="h-4 w-4" />
              Add New
            </Button>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          {/* View mode toggle */}
          <div className="border-input flex overflow-hidden rounded-md border">
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 rounded-none px-2.5"
              onClick={() => setViewMode('list')}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="h-8 rounded-none px-2.5"
              onClick={() => setViewMode('grid')}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={fetchContent}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      {/* ============ TABS (NodePress-style "subsubsub") ============ */}
      <div className="mb-4 border-b border-[#c3c4c7]">
        <div className="-mb-px flex items-center gap-0">
          {(['all', 'publish', 'draft', 'pending', 'trash'] as const).map((status) => (
            <button
              key={status}
              onClick={() => {
                setStatusFilter(status);
                setPage(1);
              }}
              className={cn(
                'relative inline-flex items-center gap-1 px-3 py-2 text-sm font-medium transition-colors',
                statusFilter === status
                  ? 'text-[#1d2327] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#1d2327]'
                  : 'text-[#50575e] hover:text-[#1d2327]',
              )}
            >
              {status === 'all' ? 'All' : statusConfig[status]?.label || status}
              {meta && status === 'all' && (
                <span className="text-xs text-[#8c8f94]">({meta.total})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ============ LIST VIEW ============ */}
      {viewMode === 'list' ? (
        <div className="rounded-lg border border-[#c3c4c7] bg-white shadow-sm">
          {/* Table toolbar */}
          <div className="flex flex-wrap items-center gap-3 border-b border-[#c3c4c7] px-4 py-3">
            {/* Bulk actions */}
            <div className="flex items-center gap-2">
              <Select
                value={bulkAction}
                onValueChange={setBulkAction}
                disabled={selected.length === 0}
              >
                <SelectTrigger className="h-9 w-44 text-sm">
                  <SelectValue
                    placeholder={
                      selected.length > 0 ? `${selected.length} selected` : 'Bulk Actions'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="publish">Publish</SelectItem>
                  <SelectItem value="draft">Move to Draft</SelectItem>
                  <SelectItem value="unpublish">Unpublish</SelectItem>
                  <SelectItem value="trash" className="text-destructive">
                    Move to Trash
                  </SelectItem>
                  <SelectItem value="delete" className="text-destructive">
                    Delete Permanently
                  </SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={handleBulkAction}
                disabled={!bulkAction || selected.length === 0 || bulkProcessing}
              >
                {bulkProcessing ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : null}
                Apply
              </Button>
            </div>

            {/* Search */}
            <div className="relative ml-auto min-w-[200px] max-w-xs">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8c8f94]" />
              <Input
                placeholder={`Search ${typeFilter === 'post' ? 'posts' : 'pages'}...`}
                className="h-9 border-[#c3c4c7] pl-8 text-sm"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>

          {/* Bulk processing progress */}
          {bulkProcessing && (
            <div className="border-b border-[#c3c4c7] bg-[#f0f6fc] px-4 py-2 text-sm text-[#2271b1]">
              <Loader2 className="mr-1.5 inline h-3.5 w-3.5 animate-spin" />
              Processing {selected.length} item(s)...
            </div>
          )}

          {/* ===== TABLE ===== */}
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <FileText className="mb-4 h-16 w-16 text-[#c3c4c7]" />
              <h3 className="text-lg font-semibold text-[#1d2327]">
                No {typeFilter === 'post' ? 'posts' : 'pages'} found
              </h3>
              <p className="mt-1 max-w-sm text-sm text-[#646970]">
                {search
                  ? `No ${typeFilter === 'post' ? 'posts' : 'pages'} match your search criteria. Try different keywords.`
                  : `Get started by creating your first ${typeFilter === 'post' ? 'post' : 'page'}.`}
              </p>
              {!search && (
                <Link href={`/admin/content/${typeFilter}/new`}>
                  <Button className="mt-5 gap-1.5">
                    <Plus className="h-4 w-4" />
                    Create your first {typeFilter === 'post' ? 'post' : 'page'}
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-[#c3c4c7] hover:bg-transparent">
                  <TableHead className="w-10">
                    <Checkbox
                      checked={items.length > 0 && selected.length === items.length}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#50575e]">
                    Title
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#50575e]">
                    Author
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#50575e]">
                    Categories
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#50575e]">
                    Tags
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-[#50575e]">
                    Date
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow
                    key={item.id}
                    className={cn(
                      'group border-[#c3c4c7]',
                      item.status === 'trash' && 'opacity-70',
                    )}
                  >
                    {/* Checkbox */}
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                        aria-label={`Select "${item.title}"`}
                      />
                    </TableCell>

                    {/* Title column */}
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-1.5">
                          {item.isSticky && (
                            <Star
                              className="h-3.5 w-3.5 shrink-0 text-[#dba617]"
                              fill="currentColor"
                            />
                          )}
                          {item.isPasswordProtected && (
                            <Lock className="h-3.5 w-3.5 shrink-0 text-[#8c8f94]" />
                          )}
                          <button
                            onClick={() => router.push(`/admin/content/${item.type}/${item.id}`)}
                            className="cursor-pointer text-left text-sm font-medium text-[#2271b1] transition-colors hover:text-[#135e96]"
                          >
                            {item.title || '(untitled)'}
                          </button>
                        </div>
                        <span className="font-mono text-xs text-[#8c8f94]">{item.slug}</span>
                        {/* Row actions (NodePress-style) */}
                        <div className="mt-0.5 flex items-center gap-0 text-xs text-[#8c8f94]">
                          <button
                            onClick={() => router.push(`/admin/content/${item.type}/${item.id}`)}
                            className="cursor-pointer hover:text-[#2271b1]"
                          >
                            Edit
                          </button>
                          <span className="mx-1">|</span>
                          <button className="cursor-pointer hover:text-[#2271b1]">
                            Quick Edit
                          </button>
                          <span className="mx-1">|</span>
                          <button
                            onClick={() => setDeleteItem(item)}
                            className="cursor-pointer text-[#b32d2e] hover:text-[#d63638]"
                          >
                            Trash
                          </button>
                          <span className="mx-1">|</span>
                          <button className="cursor-pointer hover:text-[#2271b1]">View</button>
                        </div>
                      </div>
                    </TableCell>

                    {/* Author */}
                    <TableCell className="text-sm text-[#3c434a]">
                      {item.author?.name || 'Unknown'}
                    </TableCell>

                    {/* Categories */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.categories && item.categories.length > 0 ? (
                          item.categories.slice(0, 2).map((cat) => (
                            <Badge
                              key={cat.id}
                              variant="secondary"
                              className="bg-[#f0f0f1] text-xs font-normal text-[#50575e] hover:bg-[#e0e0e1]"
                            >
                              {cat.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-[#8c8f94]">&mdash;</span>
                        )}
                        {item.categories && item.categories.length > 2 && (
                          <span className="text-xs text-[#8c8f94]">
                            +{item.categories.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>

                    {/* Tags */}
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.tags && item.tags.length > 0 ? (
                          item.tags.slice(0, 3).map((tag) => (
                            <Badge
                              key={tag.id}
                              variant="outline"
                              className="border-[#dcdcde] text-xs font-normal text-[#50575e]"
                            >
                              {tag.name}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-xs text-[#8c8f94]">&mdash;</span>
                        )}
                        {item.tags && item.tags.length > 3 && (
                          <span className="text-xs text-[#8c8f94]">+{item.tags.length - 3}</span>
                        )}
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="whitespace-nowrap">
                      <div className="group/date relative">
                        <span className="text-sm text-[#3c434a]">
                          {formatDate(item.createdAt, { dateStyle: 'medium' })}
                        </span>
                        {/* Tooltip on hover */}
                        <div className="invisible absolute bottom-full left-0 z-10 mb-1 whitespace-nowrap rounded bg-[#1d2327] px-2 py-1 text-xs text-[#f0f0f1] opacity-0 shadow-lg transition-opacity group-hover/date:visible group-hover/date:opacity-100">
                          <div>
                            Published:{' '}
                            {formatDate(item.createdAt, { dateStyle: 'full', timeStyle: 'short' })}
                          </div>
                          <div>
                            Modified:{' '}
                            {formatDate(item.modifiedAt, { dateStyle: 'full', timeStyle: 'short' })}
                          </div>
                        </div>
                        <div className="mt-0.5 text-xs text-[#8c8f94]">
                          {formatDate(item.createdAt, {
                            timeStyle: 'short',
                          } as Intl.DateTimeFormatOptions)}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* ===== PAGINATION (bottom) ===== */}
          {!isEmpty && (
            <div className="flex items-center justify-between border-t border-[#c3c4c7] px-4 py-3">
              <span className="text-sm text-[#50575e]">
                Page {page} of {totalPages || 1} ({meta?.total || 0}{' '}
                {typeFilter === 'post' ? 'posts' : 'pages'})
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  ‹ Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next ›
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* ============ GRID VIEW ============ */
        <div>
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#c3c4c7] bg-white py-16 text-center">
              <FileText className="mb-4 h-16 w-16 text-[#c3c4c7]" />
              <h3 className="text-lg font-semibold text-[#1d2327]">
                No {typeFilter === 'post' ? 'posts' : 'pages'} found
              </h3>
              <p className="mt-1 max-w-sm text-sm text-[#646970]">
                {search
                  ? 'Try different search terms.'
                  : `Get started by creating your first ${typeFilter === 'post' ? 'post' : 'page'}.`}
              </p>
              {!search && (
                <Link href={`/admin/content/${typeFilter}/new`}>
                  <Button className="mt-5 gap-1.5">
                    <Plus className="h-4 w-4" />
                    Create your first {typeFilter === 'post' ? 'post' : 'page'}
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm text-[#50575e]">
                  {meta?.total || 0} {typeFilter === 'post' ? 'posts' : 'pages'}
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="group rounded-lg border border-[#c3c4c7] bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          checked={selected.includes(item.id)}
                          onCheckedChange={() => toggleSelect(item.id)}
                          aria-label={`Select "${item.title}"`}
                        />
                        <Badge
                          variant={statusConfig[item.status]?.variant || 'secondary'}
                          className="text-[10px]"
                        >
                          {statusConfig[item.status]?.label || item.status}
                        </Badge>
                        {item.isSticky && (
                          <Star className="h-3 w-3 text-[#dba617]" fill="currentColor" />
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => router.push(`/admin/content/${item.type}/${item.id}`)}
                      className="cursor-pointer text-left text-sm font-medium text-[#2271b1] transition-colors hover:text-[#135e96]"
                    >
                      {item.title || '(untitled)'}
                    </button>
                    <p className="mt-1 line-clamp-2 text-xs text-[#8c8f94]">
                      {item.excerpt || 'No excerpt...'}
                    </p>
                    <div className="mt-3 flex items-center gap-2 border-t border-[#f0f0f1] pt-2 text-xs text-[#8c8f94]">
                      <span>{item.author?.name || 'Unknown'}</span>
                      <span>·</span>
                      <span>{formatDate(item.createdAt, { dateStyle: 'medium' })}</span>
                    </div>
                    <div className="mt-2 flex items-center gap-0 text-xs text-[#8c8f94]">
                      <button
                        onClick={() => router.push(`/admin/content/${item.type}/${item.id}`)}
                        className="cursor-pointer hover:text-[#2271b1]"
                      >
                        Edit
                      </button>
                      <span className="mx-1">|</span>
                      <button
                        onClick={() => setDeleteItem(item)}
                        className="cursor-pointer text-[#b32d2e] hover:text-[#d63638]"
                      >
                        Trash
                      </button>
                      <span className="mx-1">|</span>
                      <button className="cursor-pointer hover:text-[#2271b1]">View</button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Grid pagination */}
              <div className="mt-4 flex items-center justify-between border-t border-[#c3c4c7] pt-4">
                <span className="text-sm text-[#50575e]">
                  Page {page} of {totalPages || 1}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    ‹ Prev
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next ›
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============ BULK CONFIRMATION DIALOG ============ */}
      <Dialog
        open={showBulkConfirm}
        onOpenChange={(o) => {
          if (!o) setShowBulkConfirm(false);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {bulkAction === 'trash' ? 'Move to Trash' : 'Delete Permanently'}
            </DialogTitle>
            <DialogDescription>
              {bulkAction === 'trash'
                ? `Are you sure you want to move ${selected.length} item(s) to trash?`
                : `Are you sure you want to permanently delete ${selected.length} item(s)? This action cannot be undone.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowBulkConfirm(false)}
              disabled={bulkProcessing}
            >
              Cancel
            </Button>
            <Button
              variant={bulkAction === 'delete' ? 'destructive' : 'default'}
              onClick={executeBulkAction}
              disabled={bulkProcessing}
            >
              {bulkProcessing
                ? 'Processing...'
                : bulkAction === 'trash'
                  ? 'Move to Trash'
                  : 'Delete Permanently'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ SINGLE DELETE DIALOG ============ */}
      <Dialog
        open={!!deleteItem}
        onOpenChange={(o) => {
          if (!o) setDeleteItem(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Move to Trash</DialogTitle>
            <DialogDescription>
              Are you sure you want to move &ldquo;{deleteItem?.title}&rdquo; to trash? You can
              restore it later from the Trash tab.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Moving...' : 'Move to Trash'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
