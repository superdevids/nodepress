'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { MoreHorizontal, Eye, Edit, Copy, Trash2, Search, Filter, ArrowUpDown } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BulkActions } from './bulk-actions';
import { QuickEdit } from './quick-edit';
import { formatDate } from '@/lib/utils';

interface ContentItem {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published' | 'pending' | 'trashed';
  author: string;
  date: Date;
  type: string;
}

interface ContentListProps {
  items: ContentItem[];
  type?: string;
}

const statusColors: Record<string, 'success' | 'secondary' | 'warning' | 'destructive'> = {
  published: 'success',
  draft: 'secondary',
  pending: 'warning',
  trashed: 'destructive',
};

export function ContentList({ items, type }: ContentListProps) {
  const router = useRouter();
  const [selected, setSelected] = React.useState<string[]>([]);
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [quickEditId, setQuickEditId] = React.useState<string | null>(null);
  const [sortField, setSortField] = React.useState<'date' | 'title'>('date');
  const [sortDir, setSortDir] = React.useState<'asc' | 'desc'>('desc');

  const filtered = items
    .filter((item) => {
      if (search && !item.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortField === 'title') {
        return sortDir === 'asc' ? a.title.localeCompare(b.title) : b.title.localeCompare(a.title);
      }
      return sortDir === 'asc'
        ? a.date.getTime() - b.date.getTime()
        : b.date.getTime() - a.date.getTime();
    });

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

  const handleBulkAction = (_action: string) => {
    // TODO: implement bulk action using the API client
    setSelected([]);
  };

  const toggleSort = (field: 'date' | 'title') => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir(field === 'date' ? 'desc' : 'asc');
    }
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search className="text-muted-foreground absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search content..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="trashed">Trashed</SelectItem>
          </SelectContent>
        </Select>
        <BulkActions selectedCount={selected.length} onAction={handleBulkAction} />
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
              <TableHead>
                <button
                  onClick={() => toggleSort('title')}
                  className="flex items-center gap-1 font-medium"
                >
                  Title
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
              <TableHead>Author</TableHead>
              <TableHead>
                <button
                  onClick={() => toggleSort('date')}
                  className="flex items-center gap-1 font-medium"
                >
                  Date
                  <ArrowUpDown className="h-3 w-3" />
                </button>
              </TableHead>
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
                <React.Fragment key={item.id}>
                  <TableRow>
                    <TableCell>
                      <Checkbox
                        checked={selected.includes(item.id)}
                        onCheckedChange={() => toggleSelect(item.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <button
                          onClick={() => router.push(`/admin/content/${item.type}/${item.id}`)}
                          className="hover:text-primary text-left font-medium transition-colors"
                        >
                          {item.title}
                        </button>
                        <span className="text-muted-foreground text-xs">
                          {item.type}/{item.slug}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.author}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(item.date)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[item.status]}>{item.status}</Badge>
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
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" /> View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setQuickEditId(item.id)}>
                            <Edit className="mr-2 h-4 w-4" /> Quick Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="mr-2 h-4 w-4" /> Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <Trash2 className="mr-2 h-4 w-4" /> Trash
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                  {quickEditId === item.id && (
                    <TableRow>
                      <TableCell colSpan={6} className="p-0">
                        <div className="px-6 py-2">
                          <QuickEdit
                            entry={item}
                            onClose={() => setQuickEditId(null)}
                            onSaved={(_data: unknown) => {
                              // TODO: refresh the content list after save
                            }}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="text-muted-foreground flex items-center justify-between text-sm">
        <span>{filtered.length} items</span>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
