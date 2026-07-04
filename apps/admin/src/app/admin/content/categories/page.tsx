'use client';

import * as React from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  FolderTree,
  MoreHorizontal,
  Loader2,
  AlertCircle,
} from 'lucide-react';
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

interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
  count: number;
  taxonomy: string;
  parentId: string | null;
  createdAt: string;
}

export default function CategoriesPage() {
  const { get, post, patch, del } = useApi();
  const { success, error: showError } = useToast();
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [fetchError, setFetchError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState('');
  const [editCategory, setEditCategory] = React.useState<Category | null>(null);
  const [deleteCategory, setDeleteCategory] = React.useState<Category | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  // Form refs
  const createNameRef = React.useRef<HTMLInputElement>(null);
  const createSlugRef = React.useRef<HTMLInputElement>(null);
  const createParentRef = React.useRef<HTMLSelectElement>(null);
  const createDescRef = React.useRef<HTMLTextAreaElement>(null);
  const editNameRef = React.useRef<HTMLInputElement>(null);
  const editSlugRef = React.useRef<HTMLInputElement>(null);
  const editDescRef = React.useRef<HTMLTextAreaElement>(null);

  const fetchCategories = React.useCallback(async () => {
    setLoading(true);
    setFetchError(null);
    try {
      const res = await get<Category[]>('/api/taxonomy?taxonomy=category');
      setCategories(res.data || []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load categories';
      setFetchError(message);
      showError('Error', message);
    } finally {
      setLoading(false);
    }
  }, [get, showError]);

  React.useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const filtered = categories.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase()),
  );

  const getParentName = (parentId: string | null) => {
    if (!parentId) return '—';
    const parent = categories.find((c) => c.id === parentId);
    return parent?.name || '—';
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const name = createNameRef.current?.value || '';
      const slug = createSlugRef.current?.value || '';
      const parentId = createParentRef.current?.value || null;
      const description = createDescRef.current?.value || '';
      await post('/api/taxonomy', { taxonomy: 'category', name, slug, parentId, description });
      success('Category created', 'New category has been added.');
      if (createNameRef.current) createNameRef.current.value = '';
      if (createSlugRef.current) createSlugRef.current.value = '';
      if (createDescRef.current) createDescRef.current.value = '';
      if (createParentRef.current) createParentRef.current.value = '';
      await fetchCategories();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create category';
      showError('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editCategory) return;
    setSubmitting(true);
    try {
      const name = editNameRef.current?.value || editCategory.name;
      const slug = editSlugRef.current?.value || editCategory.slug;
      const description = editDescRef.current?.value || editCategory.description;
      await patch(`/api/taxonomy/${editCategory.id}`, { name, slug, description });
      success('Category updated', 'Category has been updated.');
      setEditCategory(null);
      await fetchCategories();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update category';
      showError('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCategory = async () => {
    if (!deleteCategory) return;
    setSubmitting(true);
    try {
      await del(`/api/taxonomy/${deleteCategory.id}`);
      success('Category deleted', `${deleteCategory.name} has been deleted.`);
      setDeleteCategory(null);
      await fetchCategories();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to delete category';
      showError('Error', message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-6">
        <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (fetchError && categories.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center p-6 text-center">
        <AlertCircle className="text-destructive mb-3 h-10 w-10" />
        <p className="text-destructive font-medium">{fetchError}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchCategories}>
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground mt-1">
            Organize your content into hierarchical categories.
          </p>
        </div>
        <Dialog>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add New Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateCategory}>
              <DialogHeader>
                <DialogTitle>Add New Category</DialogTitle>
                <DialogDescription>
                  Create a new content category. Categories can be nested.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label htmlFor="cat-name">Name</Label>
                  <Input id="cat-name" ref={createNameRef} placeholder="Category name" required />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-slug">Slug</Label>
                  <Input id="cat-slug" ref={createSlugRef} placeholder="category-slug" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-parent">Parent Category</Label>
                  <select
                    id="cat-parent"
                    ref={createParentRef}
                    className="border-input flex h-9 w-full rounded-md border bg-transparent px-3 py-1 text-sm shadow-sm"
                  >
                    <option value="">None (top-level)</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="cat-desc">Description</Label>
                  <textarea
                    id="cat-desc"
                    ref={createDescRef}
                    className="border-input flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm"
                    placeholder="Optional description"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Category'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Input
          placeholder="Search categories..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Top-level</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">            {categories.filter((c) => !c.parentId).length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Total Posts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {categories.reduce((a, c) => a + c.count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Categories table */}
      <div className="bg-background rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Posts</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground py-12 text-center">
                  <FolderTree className="mx-auto mb-2 h-8 w-8 opacity-50" />
                  No categories found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell>
                    <div>
                      <span className="font-medium">{cat.name}</span>
                      {cat.description && (
                        <p className="text-muted-foreground mt-0.5 text-xs">{cat.description}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground font-mono text-xs">
                    {cat.slug}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getParentName(cat.parentId)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{cat.count}</Badge>
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditCategory(cat)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeleteCategory(cat)}
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
      <Dialog open={!!editCategory} onOpenChange={(o) => !o && setEditCategory(null)}>
        <DialogContent>
          <form onSubmit={handleUpdateCategory}>
            <DialogHeader>
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>Update the category details.</DialogDescription>
            </DialogHeader>
            {editCategory && (
              <div className="space-y-4 py-4">
                <div className="space-y-1.5">
                  <Label>Name</Label>
                  <Input ref={editNameRef} defaultValue={editCategory.name} required />
                </div>
                <div className="space-y-1.5">
                  <Label>Slug</Label>
                  <Input ref={editSlugRef} defaultValue={editCategory.slug} />
                </div>
                <div className="space-y-1.5">
                  <Label>Description</Label>
                  <textarea
                    ref={editDescRef}
                    className="border-input flex min-h-[80px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-sm"
                    defaultValue={editCategory.description}
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Updating...' : 'Update Category'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={!!deleteCategory} onOpenChange={(o) => !o && setDeleteCategory(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteCategory?.name}? Posts in this category will be
              uncategorized.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteCategory(null)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteCategory} disabled={submitting}>
              {submitting ? 'Deleting...' : 'Delete Category'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
