"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ContentEditor } from "@/components/content/content-editor";

export default function NewContentPage() {
  const params = useParams();
  const router = useRouter();
  const type = params.type as string;

  return (
    <div className="space-y-0">
      {/* Back button */}
      <div className="border-b px-6 py-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/admin/content/${type}`)}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {type}s
        </Button>
      </div>

      {/* Page header */}
      <div className="border-b px-6 py-4">
        <h1 className="text-xl font-bold tracking-tight">
          Add New {type.charAt(0).toUpperCase() + type.slice(1)}
        </h1>
      </div>

      {/* Editor */}
      <ContentEditor contentType={type} />
    </div>
  );
}
