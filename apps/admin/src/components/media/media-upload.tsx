'use client';

import * as React from 'react';
import {
  Upload,
  X,
  File,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useApi } from '@/lib/use-api';

interface UploadFile {
  id: string;
  name: string;
  size: number;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
  preview?: string;
}

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/pdf',
  'application/zip',
  'text/plain',
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
  const { error: showError, success } = useToast();
  const { upload } = useApi();
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
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
    if (!ALLOWED_TYPES.includes(file.type) && !file.type.startsWith('image/')) {
      return `File type "${file.type || 'unknown'}" is not supported.`;
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
      showError('Upload error', errors.join('\n'));
    }

    const newFiles: UploadFile[] = validFiles.map((f) => {
      const preview = f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined;
      return {
        id: `upload_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: f.name,
        size: f.size,
        progress: 0,
        status: 'uploading' as const,
        preview,
      };
    });

    setFiles((prev) => [...prev, ...newFiles]);

    // Upload each file to the real API
    newFiles.forEach((file, index) => {
      const originalFile = validFiles[index];
      if (!originalFile) return;
      const formData = new FormData();
      formData.append('file', originalFile);
      formData.append('stripExif', String(stripExif));

      upload<{ id: string; url: string }>('/api/media/upload', formData, (pct) => {
        setFiles((prev) => prev.map((f) => (f.id === file.id ? { ...f, progress: pct } : f)));
      })
        .then(() => {
          setFiles((prev) =>
            prev.map((f) => (f.id === file.id ? { ...f, progress: 100, status: 'complete' } : f)),
          );
          success('Uploaded', `${file.name} uploaded successfully.`);
          onUploadComplete?.([file]);
        })
        .catch((err: Error) => {
          setFiles((prev) =>
            prev.map((f) => (f.id === file.id ? { ...f, status: 'error', error: err.message } : f)),
          );
          showError('Upload failed', err.message);
        });
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
    const units = ['B', 'KB', 'MB'];
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
          'cursor-pointer rounded-lg border-2 border-dashed p-12 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
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
        <Upload className="text-muted-foreground mx-auto mb-4 h-10 w-10" />
        <p className="text-sm font-medium">
          {isDragging ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
        </p>
        <p className="text-muted-foreground mt-1 text-xs">
          Supports images, videos, audio, PDFs, and documents (max 50MB)
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox id="strip-exif" checked={stripExif} onCheckedChange={(c) => setStripExif(!!c)} />
        <Label htmlFor="strip-exif" className="cursor-pointer text-xs">
          Strip EXIF data from images
        </Label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file) => (
            <div key={file.id} className="bg-muted/50 flex items-center gap-3 rounded-md p-3">
              {file.preview ? (
                <img
                  src={file.preview}
                  alt={file.name}
                  className="h-10 w-10 shrink-0 rounded object-cover"
                />
              ) : (
                <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded">
                  <File className="text-muted-foreground h-5 w-5" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <div className="text-muted-foreground flex items-center gap-2 text-xs">
                  <span>{formatSize(file.size)}</span>
                  <span>&middot;</span>
                  <span
                    className={
                      file.status === 'error'
                        ? 'text-destructive'
                        : file.status === 'complete'
                          ? 'text-emerald-600'
                          : ''
                    }
                  >
                    {file.status === 'uploading'
                      ? `${Math.round(file.progress)}%`
                      : file.status === 'complete'
                        ? 'Complete'
                        : file.error || 'Error'}
                  </span>
                  {file.status === 'complete' && (
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  )}
                  {file.status === 'error' && <AlertCircle className="text-destructive h-3 w-3" />}
                </div>
                {file.status === 'uploading' && (
                  <div className="bg-muted mt-1 h-1.5 w-full rounded-full">
                    <div
                      className="bg-primary h-1.5 rounded-full transition-all duration-200"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}
              </div>
              {file.status !== 'uploading' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
              {file.status === 'uploading' && (
                <Loader2 className="text-muted-foreground h-4 w-4 shrink-0 animate-spin" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
