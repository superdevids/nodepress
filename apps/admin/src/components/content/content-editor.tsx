"use client";

import * as React from "react";
import { ContentForm, type ContentFormData } from "./content-form";

interface ContentEditorProps {
  contentType: string;
  entryId?: string;
  initialData?: Partial<ContentFormData>;
}

/**
 * Content Editor — wraps ContentForm with block editor integration.
 * In a full implementation, this would integrate with @nodepress/editor (Tiptap).
 */
export function ContentEditor({ contentType, entryId, initialData }: ContentEditorProps) {
  const handleSubmit = async (data: ContentFormData, action: "draft" | "publish") => {
    // API call to create/update content entry
    console.log(`${action} ${contentType}:`, { ...data, entryId });
    await new Promise((resolve) => setTimeout(resolve, 800));
  };

  return (
    <div className="max-w-4xl mx-auto py-6 px-6">
      <ContentForm
        contentType={contentType}
        initialData={initialData}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
