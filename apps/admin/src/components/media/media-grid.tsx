'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Image,
  FileVideo,
  FileAudio,
  File,
  FileText,
  MoreHorizontal,
  Trash2,
  Download,
  Eye,
  Edit3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatDate, formatBytes } from '@/lib/utils';

interface MediaItem {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  altText?: string;
  createdAt: Date;
}

interface MediaGridProps {
  items: MediaItem[];
  onSelect?: (item: MediaItem) => void;
  selected?: string[];
  viewMode?: 'grid' | 'list';
  onEdit?: (item: MediaItem) => void;
  onDelete?: (item: MediaItem) => void;
}

const mimeIcons: Record<string, React.ElementType> = {
  'image/': Image,
  'video/': FileVideo,
  'audio/': FileAudio,
  'application/pdf': FileText,
  'text/': FileText,
};

function getIcon(mimeType: string): React.ElementType {
  const prefix = Object.keys(mimeIcons).find((k) => mimeType.startsWith(k));
  return (prefix ? mimeIcons[prefix] : File) as React.ElementType;
}

export function MediaGrid({
  items,
  onSelect,
  selected = [],
  viewMode = 'grid',
  onEdit,
  onDelete,
}: MediaGridProps) {
  const router = useRouter();

  if (viewMode === 'list') {
    return (
      <div className="bg-background rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50 border-b">
              <th className="w-10 p-3">
                <Checkbox />
              </th>
              <th className="p-3 text-left font-medium">Name</th>
              <th className="hidden p-3 text-left font-medium sm:table-cell">Type</th>
              <th className="hidden p-3 text-left font-medium md:table-cell">Size</th>
              <th className="hidden p-3 text-left font-medium md:table-cell">Date</th>
              <th className="w-10 p-3" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const isSelected = selected.includes(item.id);
              const Icon = getIcon(item.mimeType);
              return (
                <tr
                  key={item.id}
                  className={`hover:bg-muted/50 border-b transition-colors ${
                    isSelected ? 'bg-muted/30' : ''
                  }`}
                >
                  <td className="p-3">
                    <Checkbox checked={isSelected} onCheckedChange={() => onSelect?.(item)} />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded">
                        {item.mimeType.startsWith('image/') ? (
                          <img
                            src={item.url}
                            alt={item.altText || item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Icon className="text-muted-foreground h-5 w-5" />
                        )}
                      </div>
                      <div>
                        <button
                          onClick={() => router.push(`/admin/media/${item.id}`)}
                          className="hover:text-primary text-left font-medium transition-colors"
                        >
                          {item.name}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="text-muted-foreground hidden p-3 sm:table-cell">
                    {item.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                  </td>
                  <td className="text-muted-foreground hidden p-3 md:table-cell">
                    {formatBytes(item.size)}
                  </td>
                  <td className="text-muted-foreground hidden p-3 md:table-cell">
                    {formatDate(item.createdAt)}
                  </td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit?.(item)}>
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => onDelete?.(item)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
      {items.map((item) => {
        const isImage = item.mimeType.startsWith('image/');
        const isSelected = selected.includes(item.id);
        const Icon = getIcon(item.mimeType);

        return (
          <Card
            key={item.id}
            className={`group cursor-pointer transition-all hover:shadow-md ${
              isSelected ? 'ring-primary ring-2' : ''
            }`}
            onClick={() => onSelect?.(item)}
          >
            <CardContent className="p-2">
              <div
                className="bg-muted relative mb-2 flex aspect-square items-center justify-center overflow-hidden rounded-md"
                onClick={() => router.push(`/admin/media/${item.id}`)}
              >
                {isImage ? (
                  <img
                    src={item.url}
                    alt={item.altText || item.name}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Icon className="text-muted-foreground h-10 w-10" />
                )}
                <div className="absolute left-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <Checkbox checked={isSelected} onCheckedChange={() => onSelect?.(item)} />
                </div>
                <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="secondary" size="icon" className="h-7 w-7">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit?.(item)}>
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => onDelete?.(item)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="truncate text-xs font-medium">{item.name}</p>
                <div className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
                  <Badge variant="outline" className="h-auto px-1 py-0 text-[10px]">
                    {item.mimeType.split('/')[1]?.toUpperCase() || 'FILE'}
                  </Badge>
                  <span>{formatBytes(item.size)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
