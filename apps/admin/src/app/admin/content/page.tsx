'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, Search, Filter, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
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
import { MoreHorizontal, Edit, Eye, Copy, Trash2 } from 'lucide-react';
import { useApi, ApiMeta } from '@/lib/use-api';
import { useToast } from '@/components/ui/toast';
import { formatDate } from '@/lib/utils';

interface ContentEntry {
  id: string;
  type: string;
  title: string;
  slug: string;
  status: 'draft' | 'publish' | 'pending' | 'private';
  authorId: string;
  createdAt: string;
  updatedAt: string;
}

const statusColors: Record<string, 'success' | 'secondary' | 'warning' | 'destructive' | 'default'> = {
  publish: 'success',
  draft: 'secondary',
  pending: 'warning',
  private: 'default',
  trashed: 'destructive',
};

export default function ContentPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { get, del } = useApi();
  const { success, error: showError } = useToast();

  const [items, setItems] = React.useState<ContentEntry[]>([]);
  const [meta, setMeta] = React.useState<ApiMeta | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState(searchParams.get('search') || '');
  const [typeFilter, setTypeFilter] = React.useState(searchParams.get('type') || 'post');
  const [statusFilter, setStatusFilter] = React.useState(searchParams.get('status') || 'all');
  const [page, setPage] = React.useState(Number(searchParams.get('page')) || 1);
  const [deleteItem, setDeleteItem] = React.useState<ContentEntry | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const fetchContent = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('limit', '20');
      if (statusFilter !== 'all') params.set('status', statusFilter);

      const res = await get<ContentEntry[]>(`/api/content/${typeFilter}?${params}`);
      setItems(res.data || []);
      setMeta(res.meta || null);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load content';
      setFetchError(message);
    } finally {
      setLoading(false);
    }
  }, [get, typeFilter, statusFilter, page]);

  React.useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  // Update URL params
  React.useEffect(() => {
    const params = new URLSearchParams();
    if (page > 1) params.set('page', String(page));
    if (typeFilter !== 'post') params.set('type', typeFilter);
    if (statusFilter !== 'all') params.set('status', statusFilter);
    if (search) params.set('search', search);
    const qs = params.toString();
    router.replace(`/admin/content${qs ? `?${qs}` : ''}`, { scroll: false });
  }, [page, typeFilter, statusFilter, search, router]);

  const filtered = items.filter((item) =>
    !search || item.title.toLowerCase().includes(search.toLowerCase()),
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selected.length === filtered.length) {
      setSelected([]);
    } else {
      setSelected(filtered.map((f) => f.id));
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await del(`/api/content/${deleteItem.type}/${deleteItem.id}`);
      success('Deleted', `${deleteItem.title} has been deleted.`);
      setDeleteItem(null);
      await fetchContent();
    } catch (err: unknown) {
      showError('Delete failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const totalPages = meta ? meta.totalPages : 1;

  if (loading && items.length === 0) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-36" />
            <Skeleton className="mt-2 h-4 w-56" />
          </div>
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="bg-background rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                {['Title', 'Author', 'Date', 'Status', ''].map((h) => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 5 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="text-destructive font-medium">Failed to load content</p>
        <p className="text-muted-foreground mt-1 text-sm">{fetchError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchContent}>
          <RefreshCw className="mr-1.5 h-4 w-4" /> Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {typeFilter === 'post' ? 'Posts' : typeFilter === 'page' ? 'Pages' : 'All Content'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your {typeFilter === 'post' ? 'posts' : typeFilter === 'page' ? 'pages' : 'content'}.
            {meta && ` ${meta.total} total`}
          </p>
        </div>
        <Link href={`/admin/content/${typeFilter}/new`}>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add New
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search content..."
            className="pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="post">Posts</SelectItem>
            <SelectItem value="page">Pages</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="publish">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="private">Private</SelectItem>
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button variant="outline" size="icon" onClick={fetchContent} title="Refresh">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-background rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={filtered.length > 0 && selected.length === filtered.length}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground py-12 text-center">
                  No content found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <Checkbox
                      checked={selected.includes(item.id)}
                      onCheckedChange={() => toggleSelect(item.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => router.push(`/admin/content/${item.type}/${item.id}`)}
                      className="hover:text-primary text-left font-medium transition-colors"
                    >
                      {item.title || '(untitled)'}
                    </button>
                    <span className="text-muted-foreground block text-xs">{item.slug}</span>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{item.type}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatDate(item.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[item.status] || 'default'}>
                      {item.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => router.push(`/admin/content/${item.type}/${item.id}`)}
                        >
                          <Edit className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteItem(item)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {meta && totalPages > 1 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Page {meta.page} of {totalPages} ({meta.total} items)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <Dialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Content</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &ldquo;{deleteItem?.title}&rdquo;? This action cannot be undone.
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
