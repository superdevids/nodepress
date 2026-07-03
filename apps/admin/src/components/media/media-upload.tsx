"use client";

import * as React from "react";
import { Upload, X, File, AlertCircle, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface UploadFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: "uploading" | "complete" | "error";
  error?: string;
  preview?: string;
}

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "application/pdf",
  "application/zip",
  "text/plain",
];

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export function MediaUpload({
  onUploadComplete,
}: {
  onUploadComplete?: (files: UploadFile[]) => void;
}) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [files, setFiles] = React.useState<UploadFile[]>([]);
  const [stripExif, setStripExif] = React.useState(true);
  const { error: showError } = useToast();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const intervalRefs = React.useRef<ReturnType<typeof setInterval>[]>([]);

  React.useEffect(() => {
    return () => {
      intervalRefs.current.forEach(clearInterval);
      intervalRefs.current = [];
    };
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragging(true);
    } else if (e.type === "dragleave") {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    processFiles(droppedFiles);
  };

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith("image/")) {
      return `File type "${file.type || "unknown"}" is not supported.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" exceeds the 50MB limit.`;
    }
    return null;
  };

  const processFiles = (fileList: File[]) => {
    const errors: string[] = [];
    const validFiles: File[] = [];

    fileList.forEach((f) => {
      const validationError = validateFile(f);
      if (validationError) {
        errors.push(validationError);
      } else {
        validFiles.push(f);
      }
    });

    if (errors.length > 0) {
      showError("Upload error", errors.join("\n"));
    }

    const newFiles: UploadFile[] = validFiles.map((f) => {
      const preview =
        f.type.startsWith("image/")
          ? URL.createObjectURL(f)
          : undefined;
      return {
        id: `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: f.name,
        size: f.size,
        progress: 0,
        status: "uploading" as const,
        preview,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);

    newFiles.forEach((file) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += Math.random() * 25 + 5;
        if (progress >= 100) {
          progress = 100;
          clearInterval(interval);
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id
                ? { ...f, progress: 100, status: "complete" as const }
                : f,
            ),
          );
          onUploadComplete?.(newFiles);
        } else {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, progress } : f,
            ),
          );
        }
      }, 200);
      intervalRefs.current.push(interval);
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === id);
      if (file?.preview) URL.revokeObjectURL(file.preview);
      return prev.filter((f) => f.id !== id);
    });
  };

  const formatSize = (bytes: number) => {
    const units = ["B", "KB", "MB"];
    let size = bytes;
    let i = 0;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  };

  return (
    <div className="space-y-4">
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-lg p-12 text-center cursor-pointer transition-colors",
          isDragging
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-muted-foreground/50",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,application/pdf,.zip,.csv,.json,.xml"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) processFiles(Array.from(e.target.files));
          }}
        />
        <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
        <p className="text-sm font-medium">
          {isDragging
            ? "Drop files here"
            : "Drag & drop files here, or click to browse"}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Supports images, videos, audio, PDFs, and documents (max 50MB)
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="strip-exif"
          checked={stripExif}
          onCheckedChange={(c) => setStripExif(!!c)}
        />
        <Label htmlFor="strip-exif" className="text-xs cursor-pointer">
          Strip EXIF data from images
        </Label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 bg-muted/50 rounded-md p-3"
            >
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="h-10 w-10 rounded object-cover shrink-0"
                />
              ) : (
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center shrink-0">
                  <File className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatSize(file.size)}</span>
                  <span>\u00B7</span>
                  <span
                    className={
                      file.status === "error" ? "text-destructive" : ""
                    }
                  >
                    {file.status === "uploading"
                      ? `${Math.round(file.progress)}%`
                      : file.status === "complete"
                        ? "Complete"
                        : file.error || "Error"}
                  </span>
                </div>
                {file.status === "uploading" && (
                  <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => removeFile(file.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
