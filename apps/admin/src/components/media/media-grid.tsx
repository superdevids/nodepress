"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
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
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDate, formatBytes } from "@/lib/utils";

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
  viewMode?: "grid" | "list";
}

const mimeIcons: Record<string, React.ElementType> = {
  "image/": Image,
  "video/": FileVideo,
  "audio/": FileAudio,
  "application/pdf": FileText,
  "text/": FileText,
};

function getIcon(mimeType: string) {
  const prefix = Object.keys(mimeIcons).find((k) =>
    mimeType.startsWith(k),
  );
  return prefix ? mimeIcons[prefix] : File;
}

export function MediaGrid({
  items,
  onSelect,
  selected = [],
  viewMode = "grid",
}: MediaGridProps) {
  const router = useRouter();

  if (viewMode === "list") {
    return (
      <div className="rounded-md border bg-background">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="w-10 p-3">
                <Checkbox />
              </th>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium hidden sm:table-cell">
                Type
              </th>
              <th className="text-left p-3 font-medium hidden md:table-cell">
                Size
              </th>
              <th className="text-left p-3 font-medium hidden md:table-cell">
                Date
              </th>
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
                  className={`border-b hover:bg-muted/50 transition-colors ${
                    isSelected ? "bg-muted/30" : ""
                  }`}
                >
                  <td className="p-3">
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => onSelect?.(item)}
                    />
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0 overflow-hidden">
                        {item.mimeType.startsWith("image/") ? (
                          <img
                            src={item.url}
                            alt={item.altText || item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <button
                          onClick={() =>
                            router.push(`/admin/media/${item.id}`)
                          }
                          className="font-medium hover:text-primary transition-colors text-left"
                        >
                          {item.name}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="p-3 text-muted-foreground hidden sm:table-cell">
                    {item.mimeType.split("/")[1]?.toUpperCase() || "FILE"}
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">
                    {formatBytes(item.size)}
                  </td>
                  <td className="p-3 text-muted-foreground hidden md:table-cell">
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
                        <DropdownMenuItem
                          onClick={() =>
                            router.push(`/admin/media/${item.id}`)
                          }
                        >
                          <Edit3 className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Download className="mr-2 h-4 w-4" /> Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
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
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
      {items.map((item) => {
        const isImage = item.mimeType.startsWith("image/");
        const isSelected = selected.includes(item.id);
        const Icon = getIcon(item.mimeType);

        return (
          <Card
            key={item.id}
            className={`group cursor-pointer transition-all hover:shadow-md ${
              isSelected ? "ring-2 ring-primary" : ""
            }`}
            onClick={() => onSelect?.(item)}
          >
            <CardContent className="p-2">
              <div
                className="aspect-square rounded-md bg-muted flex items-center justify-center overflow-hidden mb-2 relative"
                onClick={() => router.push(`/admin/media/${item.id}`)}
              >
                {isImage ? (
                  <img
                    src={item.url}
                    alt={item.altText || item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon className="h-10 w-10 text-muted-foreground" />
                )}
                <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => onSelect?.(item)}
                  />
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      asChild
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-7 w-7"
                      >
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() =>
                          router.push(`/admin/media/${item.id}`)
                        }
                      >
                        <Edit3 className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="mr-2 h-4 w-4" /> Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              <div className="space-y-0.5">
                <p className="text-xs font-medium truncate">{item.name}</p>
                <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-1 py-0 h-auto"
                  >
                    {item.mimeType.split("/")[1]?.toUpperCase() || "FILE"}
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
