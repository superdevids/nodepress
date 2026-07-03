"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save, Send, Eye, Bold, Italic, Heading2, List, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";

const contentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  slug: z.string().optional(),
  excerpt: z.string().optional(),
  content: z.string().optional(),
});

export type ContentFormData = z.infer<typeof contentSchema>;

interface ContentFormProps {
  initialData?: Partial<ContentFormData>;
  contentType: string;
  onSubmit: (data: ContentFormData, action: "draft" | "publish") => Promise<void>;
}

export function ContentForm({ initialData, contentType, onSubmit }: ContentFormProps) {
  const { success, error } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const actionRef = React.useRef<"draft" | "publish">("publish");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ContentFormData>({
    resolver: zodResolver(contentSchema),
    defaultValues: initialData,
  });

  const handleSave = async (data: ContentFormData, action: "draft" | "publish") => {
    setIsSubmitting(true);
    try {
      await onSubmit(data, action);
      success(action === "publish" ? "Published!" : "Draft saved!", "Content has been updated.");
    } catch (err) {
      error("Failed to save", "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit((data) => handleSave(data, actionRef.current))} className="space-y-6">
      {/* Title */}
      <div className="space-y-1.5">
        <Input
          placeholder={`Add ${contentType} title`}
          className="text-2xl font-bold h-12 border-none px-0 focus-visible:ring-0"
          {...register("title")}
        />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>

      {/* Slug */}
      <div className="space-y-1.5">
        <Label>Permalink</Label>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>/{contentType}/</span>
          <Input {...register("slug")} className="h-8 inline-flex w-auto min-w-[200px]" placeholder="slug" />
        </div>
      </div>

      {/* Content — Rich Text Editor Placeholder */}
      <div className="space-y-1.5">
        <Label>Content</Label>
        <div className="min-h-[300px] border rounded-md bg-background">
          {/* Toolbar */}
          <div className="flex items-center gap-1 border-b px-3 py-2 flex-wrap">
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Bold">
              <Bold className="h-4 w-4" />
            </button>
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Italic">
              <Italic className="h-4 w-4" />
            </button>
            <span className="w-px h-5 bg-border mx-1" />
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Heading">
              <Heading2 className="h-4 w-4" />
            </button>
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="List">
              <List className="h-4 w-4" />
            </button>
            <span className="w-px h-5 bg-border mx-1" />
            <button type="button" className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Link">
              <LinkIcon className="h-4 w-4" />
            </button>
          </div>
          {/* Editable Area */}
          <div
            contentEditable
            suppressContentEditableWarning
            className="min-h-[250px] p-4 focus:outline-none text-sm leading-relaxed"
            data-placeholder="Start writing..."
            style={{ fontFamily: "inherit" }}
          />
        </div>
        <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500" />
          Replace this placeholder with the block editor from @nodepress/editor for full rich-text editing.
        </p>
      </div>

      {/* Excerpt */}
      <div className="space-y-1.5">
        <Label>Excerpt</Label>
        <Textarea
          {...register("excerpt")}
          className="min-h-[80px]"
          placeholder="Write a brief excerpt..."
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between border-t pt-4">
        <Button type="button" variant="outline">
          <Eye className="h-4 w-4 mr-2" />
          Preview
        </Button>
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            variant="outline"
            disabled={isSubmitting}
            onClick={() => { actionRef.current = "draft"; }}
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting ? "Saving..." : "Save Draft"}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            onClick={() => { actionRef.current = "publish"; }}
          >
            <Send className="h-4 w-4 mr-2" />
            {isSubmitting ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>
    </form>
  );
}
