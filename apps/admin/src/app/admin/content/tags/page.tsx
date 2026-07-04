'use client';

import * as React from 'react';
import { Plus, Edit3, Trash2, Tag, MoreHorizontal, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/components/ui/toast';
import { useApi } from '@/lib/use-api';

interface TagItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
}

export default function TagsPage() {
  const { get, post, patch, del } = useApi();
  const { success, error: showError } = useToast();
  const [tags, setTags] = React.useState<TagItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [editTag, setEditTag] = React.useState<TagItem | null>(null);
  const [deleteTag, setDeleteTag] = React.useState<TagItem | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Form refs for uncontrolled inputs
  const createNameRef = React.useRef<HTMLInputElement>(null);
  const createSlugRef = React.useRef<HTMLInputElement>(null);
  const createDescRef = React.useRef<HTMLTextAreaElement>(null);
  const editNameRef = React.useRef<HTMLInputElement>(null);
  const editSlugRef = React.useRef<HTMLInputElement>(null);
  const editDescRef = React.useRef<HTMLTextAreaElement>(null);

  const fetchTags = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get<TagItem[]>('/tags');
      setTags(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load tags';
      setFetchError(message);
      showError('Error', message);
    } finally {
      setLoading(false);
    }
  }, [get, showError]);

  React.useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  const filtered = tags.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.slug.toLowerCase().includes(search.toLowerCase()),
  );

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const name = createNameRef.current?.value || '';
      const slug = createSlugRef.current?.value || '';
      const description = createDescRef.current?.value || '';
      await post('/tags', { name, slug, description });
      success('Tag created', 'New tag has been added.');
      if (createNameRef.current) createNameRef.current.value = '';
      if (createSlugRef.current) createSlugRef.current.value = '';
      if (createDescRef.current) createDescRef.current.value = '';
      await fetchTags();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create tag';
      showError('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTag) return;
    setSubmitting(true);
    try {
      const name = editNameRef.current?.value || editTag.name;
      const slug = editSlugRef.current?.value || editTag.slug;
      const description = editDescRef.current?.value || editTag.description;
      await patch(`/tags/${editTag.id}`, { name, slug, description });
      success('Tag updated', 'Tag has been updated.');
      setEditTag(null);
      await fetchTags();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update tag';
      showError('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTag = async () => {
    if (!deleteTag) return;
    setSubmitting(true);
    try {
      await del(`/tags/${deleteTag.id}`);
      success('Tag deleted', `${deleteTag.name} has been deleted.`);
      setDeleteTag(null);
      await fetchTags();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete tag';
      showError('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && tags.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fetchError && tags.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="text-destructive font-medium">{fetchError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchTags}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Tags</h1>
          <p className="text-muted-foreground mt-1">Manage tags used across your content.</p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Tag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateTag}>
              <DialogHeader>
                <DialogTitle>Add New Tag</DialogTitle>
                <DialogDescription>
                  Create a new tag. Tags are flat (non-hierarchical).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="tag-name">Name</Label>
                  <Input id="tag-name" ref={createNameRef} placeholder="Tag name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tag-slug">Slug</Label>
                  <Input id="tag-slug" ref={createSlugRef} placeholder="tag-slug" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tag-desc">Description</Label>
                  <textarea
                    id="tag-desc"
                    ref={createDescRef}
                    className="border-input flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Tag'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tags.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Posts Tagged
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tags.reduce((a, t) => a + t.postCount, 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Tags table */}
      <div className="bg-background rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-12 text-center">
                  <Tag className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  No tags found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((tag) => (
                <TableRow key={tag.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tag className="text-muted-foreground h-4 w-4" />
                      <span className="font-medium">{tag.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {tag.slug}
                  </TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate text-xs">
                    {tag.description || '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{tag.postCount}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTag(tag)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteTag(tag)}
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

      {/* Edit Dialog */}
      <Dialog open={!!editTag} onOpenChange={(o) => !o && setEditTag(null)}>
        <DialogContent>
          <form onSubmit={handleUpdateTag}>
            <DialogHeader>
              <DialogTitle>Edit Tag</DialogTitle>
              <DialogDescription>Update the tag details.</DialogDescription>
            </DialogHeader>
            {editTag && (
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input ref={editNameRef} defaultValue={editTag.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input ref={editSlugRef} defaultValue={editTag.slug} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <textarea
                    ref={editDescRef}
                    className="border-input flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm"
                    defaultValue={editTag.description}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Tag'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteTag} onOpenChange={(o) => !o && setDeleteTag(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Tag</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteTag?.name}? This will remove the tag from all
              associated content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTag(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteTag} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Tag'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
