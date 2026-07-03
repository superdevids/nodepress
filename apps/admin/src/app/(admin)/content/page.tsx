"use client";

import * as React from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentList } from "@/components/content/content-list";
import { useNotices } from "@/components/layout/admin-notices";

const mockContent = [
  { id: "1", title: "Getting Started with NodePress: A Complete Guide", slug: "getting-started", status: "published" as const, author: "Aditya", date: new Date("2026-07-02"), type: "post" },
  { id: "2", title: "Building a Custom Plugin Architecture", slug: "custom-plugin-arch", status: "draft" as const, author: "Sarah", date: new Date("2026-07-01"), type: "post" },
  { id: "3", title: "Performance Optimization Tips", slug: "perf-tips", status: "published" as const, author: "Aditya", date: new Date("2026-06-30"), type: "post" },
  { id: "4", title: "Understanding the Hook System", slug: "hook-system", status: "published" as const, author: "Mike", date: new Date("2026-06-29"), type: "post" },
  { id: "5", title: "Content Modeling Best Practices", slug: "content-modeling", status: "pending" as const, author: "Sarah", date: new Date("2026-06-28"), type: "post" },
  { id: "6", title: "Welcome to Our New Website", slug: "welcome", status: "published" as const, author: "Admin", date: new Date("2026-06-25"), type: "page" },
  { id: "7", title: "About Us", slug: "about-us", status: "published" as const, author: "Admin", date: new Date("2026-06-20"), type: "page" },
  { id: "8", title: "Contact Us Draft", slug: "contact-draft", status: "draft" as const, author: "Sarah", date: new Date("2026-06-18"), type: "page" },
];

export default function ContentPage() {
  const { addNotice } = useNotices();

  React.useEffect(() => {
    addNotice({
      type: "info",
      message: "Content management is in beta. Some features may be limited.",
      dismissible: true,
    });
  }, [addNotice]);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">All Content</h1>
          <p className="text-muted-foreground mt-1">
            Manage all posts, pages, and custom content types.
          </p>
        </div>
        <Link href="/content/post/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add New
          </Button>
        </Link>
      </div>

      <ContentList items={mockContent} />
    </div>
  );
}
