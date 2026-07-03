"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { FileText, Eye, Edit, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Entry {
  id: string;
  title: string;
  status: "published" | "draft" | "pending";
  author: string;
  authorAvatar?: string;
  date: Date;
  views: number;
  thumbnail?: string;
  type: string;
}

const recentEntries: Entry[] = [
  {
    id: "1",
    title: "Getting Started with NodePress: A Complete Guide",
    status: "published",
    author: "Aditya",
    date: new Date("2026-07-02T10:00:00"),
    views: 342,
    type: "post",
  },
  {
    id: "2",
    title: "Building a Custom Plugin Architecture",
    status: "draft",
    author: "Sarah",
    date: new Date("2026-07-01T14:30:00"),
    views: 0,
    type: "post",
  },
  {
    id: "3",
    title: "Performance Optimization Tips for Your CMS",
    status: "published",
    author: "Aditya",
    date: new Date("2026-06-30T09:15:00"),
    views: 189,
    type: "post",
  },
  {
    id: "4",
    title: "Understanding the Hook System: Actions & Filters",
    status: "published",
    author: "Mike",
    date: new Date("2026-06-29T16:45:00"),
    views: 256,
    type: "post",
  },
  {
    id: "5",
    title: "Content Modeling Best Practices in NodePress",
    status: "pending",
    author: "Sarah",
    date: new Date("2026-06-28T11:00:00"),
    views: 0,
    type: "post",
  },
  {
    id: "6",
    title: "Introduction to NodePress Hooks",
    status: "published",
    author: "Lisa",
    date: new Date("2026-06-27T08:30:00"),
    views: 145,
    type: "post",
  },
  {
    id: "7",
    title: "REST API Best Practices",
    status: "published",
    author: "Aditya",
    date: new Date("2026-06-26T15:00:00"),
    views: 312,
    type: "post",
  },
  {
    id: "8",
    title: "Security Hardening Guide",
    status: "draft",
    author: "Mike",
    date: new Date("2026-06-25T12:00:00"),
    views: 0,
    type: "page",
  },
  {
    id: "9",
    title: "Database Schema Overview",
    status: "published",
    author: "Lisa",
    date: new Date("2026-06-24T09:00:00"),
    views: 98,
    type: "post",
  },
  {
    id: "10",
    title: "Theme Development Guide",
    status: "published",
    author: "Sarah",
    date: new Date("2026-06-23T11:30:00"),
    views: 201,
    type: "post",
  },
];

const statusColors: Record<string, "success" | "secondary" | "warning"> = {
  published: "success",
  draft: "secondary",
  pending: "warning",
};

export function RecentlyPublished() {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">Recently Published</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/content")}
        >
          <FileText className="h-4 w-4 mr-2" />
          View All
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {recentEntries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {entry.thumbnail ? (
                  <img
                    src={entry.thumbnail}
                    alt=""
                    className="h-10 w-10 rounded object-cover shrink-0"
                  />
                ) : (
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={entry.authorAvatar} />
                    <AvatarFallback className="text-xs">
                      {entry.author.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                )}
                <div className="min-w-0">
                  <button
                    onClick={() =>
                      router.push(`/admin/content/${entry.type}/${entry.id}`)
                    }
                    className="text-sm font-medium truncate block hover:text-primary transition-colors text-left"
                  >
                    {entry.title}
                  </button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{entry.author}</span>
                    <span>\u00B7</span>
                    <span>{formatDate(entry.date)}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={statusColors[entry.status]}>
                  {entry.status}
                </Badge>
                {entry.views > 0 && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {entry.views}
                  </span>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() =>
                        router.push(
                          `/admin/content/${entry.type}/${entry.id}`,
                        )
                      }
                    >
                      <Edit className="mr-2 h-4 w-4" /> Quick Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem>View Preview</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
