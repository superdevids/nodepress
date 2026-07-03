"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { ContentForm, type ContentFormData } from "./content-form";

const BlockEditor = dynamic(
  () => import("@nodepress/editor").then((mod) => mod.BlockEditor),
  { ssr: false },
);

interface ContentEditorProps {
  contentType: string;
  entryId?: string;
  initialData?: Partial<ContentFormData>;
}

export function ContentEditor({ contentType, entryId, initialData }: ContentEditorProps) {
  const [content, setContent] = React.useState<string>(
    initialData?.content || "",
  );
  const [showBlockEditor, setShowBlockEditor] = React.useState(true);

  const handleSubmit = async (data: ContentFormData, action: "draft" | "publish") => {
    console.log(`${action} ${contentType}:`, { ...data, entryId });
    await new Promise((resolve) => setTimeout(resolve, 800));
  };

  const handleEditorUpdate = React.useCallback(
    ({ editor }: { editor: any }) => {
      const html = editor.getHTML();
      setContent(html);
    },
    [],
  );

  return (
    <div className="max-w-4xl mx-auto py-6 px-6">
      <div className="mb-4 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowBlockEditor(true)}
          className={`px-3 py-1.5 text-sm rounded-md ${
            showBlockEditor ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          Block Editor
        </button>
        <button
          type="button"
          onClick={() => setShowBlockEditor(false)}
          className={`px-3 py-1.5 text-sm rounded-md ${
            !showBlockEditor ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          Classic Editor
        </button>
      </div>

      {showBlockEditor ? (
        <div className="border rounded-lg bg-card mb-6">
          <BlockEditor
            content={content}
            onUpdate={handleEditorUpdate}
          />
        </div>
      ) : null}

      <ContentForm
        contentType={contentType}
        initialData={{ ...initialData, content }}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
