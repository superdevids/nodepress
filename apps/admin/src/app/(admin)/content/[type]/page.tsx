"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentList } from "@/components/content/content-list";

const typeData: Record<string, { label: string; items: { id: string; title: string; slug: string; status: "published" | "draft" | "pending" | "trashed"; author: string; date: Date; type: string }[] }> = {
  post: {
    label: "Posts",
    items: [
      { id: "1", title: "Getting Started with NodePress", slug: "getting-started", status: "published", author: "Aditya", date: new Date("2026-07-02"), type: "post" },
      { id: "2", title: "Custom Plugin Architecture", slug: "custom-plugin", status: "draft", author: "Sarah", date: new Date("2026-07-01"), type: "post" },
      { id: "3", title: "Performance Tips", slug: "perf-tips", status: "published", author: "Aditya", date: new Date("2026-06-30"), type: "post" },
      { id: "4", title: "Hook System Guide", slug: "hooks-guide", status: "published", author: "Mike", date: new Date("2026-06-29"), type: "post" },
    ],
  },
  page: {
    label: "Pages",
    items: [
      { id: "5", title: "Welcome", slug: "welcome", status: "published", author: "Admin", date: new Date("2026-06-25"), type: "page" },
      { id: "6", title: "About Us", slug: "about-us", status: "published", author: "Admin", date: new Date("2026-06-20"), type: "page" },
      { id: "7", title: "Contact Draft", slug: "contact", status: "draft", author: "Sarah", date: new Date("2026-06-18"), type: "page" },
    ],
  },
};

export default function ContentTypePage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;

  const data = typeData[type] || { label: type, items: [] };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{data.label}</h1>
          <p className="text-muted-foreground mt-1">
            Manage all {data.label.toLowerCase()}.
          </p>
        </div>
        <Button onClick={() => router.push(`/admin/content/${type}/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      <ContentList items={data.items} type={type} />
    </div>
  );
}
