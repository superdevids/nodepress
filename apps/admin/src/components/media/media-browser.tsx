"use client";

import * as React from "react";
import { Search, Grid3X3, List, SlidersHorizontal, Upload, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MediaGrid } from "./media-grid";
import { MediaUpload } from "./media-upload";
import { ScreenOptions } from "@/components/admin/screen-options";
import { formatBytes } from "@/lib/utils";

interface MediaItem {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  size: number;
  altText?: string;
  createdAt: Date;
  caption?: string;
  description?: string;
  width?: number;
  height?: number;
  focalPoint?: { x: number; y: number };
}

const mockMedia: MediaItem[] = [
  { id: "1", name: "hero-banner.jpg", url: "/mock/hero.jpg", mimeType: "image/jpeg", size: 245000, width: 1920, height: 1080, createdAt: new Date("2026-07-01") },
  { id: "2", name: "logo.png", url: "/mock/logo.png", mimeType: "image/png", size: 32000, width: 512, height: 512, createdAt: new Date("2026-06-28") },
  { id: "3", name: "intro-video.mp4", url: "/mock/video.mp4", mimeType: "video/mp4", size: 4500000, createdAt: new Date("2026-06-25") },
  { id: "4", name: "document.pdf", url: "/mock/doc.pdf", mimeType: "application/pdf", size: 120000, createdAt: new Date("2026-06-20") },
  { id: "5", name: "screenshot-01.png", url: "/mock/screen1.png", mimeType: "image/png", size: 89000, width: 1280, height: 720, createdAt: new Date("2026-06-18") },
  { id: "6", name: "team-photo.jpg", url: "/mock/team.jpg", mimeType: "image/jpeg", size: 560000, width: 2048, height: 1365, createdAt: new Date("2026-06-15") },
  { id: "7", name: "background-pattern.svg", url: "/mock/pattern.svg", mimeType: "image/svg+xml", size: 15000, createdAt: new Date("2026-06-10") },
  { id: "8", name: "podcast-episode.mp3", url: "/mock/podcast.mp3", mimeType: "audio/mpeg", size: 28000000, createdAt: new Date("2026-06-05") },
  { id: "9", name: "banner-ad.png", url: "/mock/banner.png", mimeType: "image/png", size: 45000, createdAt: new Date("2026-06-03") },
  { id: "10", name: "presentation.pptx", url: "/mock/deck.pptx", mimeType: "application/pdf", size: 2100000, createdAt: new Date("2026-06-01") },
  { id: "11", name: "wallpaper.jpg", url: "/mock/wallpaper.jpg", mimeType: "image/jpeg", size: 1200000, createdAt: new Date("2026-05-28") },
  { id: "12", name: "icon-set.svg", url: "/mock/icons.svg", mimeType: "image/svg+xml", size: 28000, createdAt: new Date("2026-05-25") },
];

type ViewMode = "grid" | "list";
type SortField = "date" | "name" | "size";

export function MediaBrowser() {
  const [search, setSearch] = React.useState("");
  const [typeFilter, setTypeFilter] = React.useState("all");
  const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [showUpload, setShowUpload] = React.useState(false);
  const [sortField, setSortField] = React.useState<SortField>("date");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");
  const [editItem, setEditItem] = React.useState<MediaItem | null>(null);

  const filtered = mockMedia
    .filter((item) => {
      if (search && !item.name.toLowerCase().includes(search.toLowerCase())) return false;
      if (typeFilter !== "all") {
        const typeGroup = item.mimeType.split("/")[0];
        if (typeFilter === "image" && typeGroup !== "image") return false;
        if (typeFilter === "video" && typeGroup !== "video") return false;
        if (typeFilter === "audio" && typeGroup !== "audio") return false;
        if (typeFilter === "document" && !["application", "text"].includes(typeGroup)) return false;
      }
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "name") cmp = a.name.localeCompare(b.name);
      else if (sortField === "size") cmp = a.size - b.size;
      else cmp = a.createdAt.getTime() - b.createdAt.getTime();
      return sortDir === "asc" ? cmp : -cmp;
    });

  const handleSelect = (item: MediaItem) => {
    setSelected((prev) =>
      prev.includes(item.id)
        ? prev.filter((id) => id !== item.id)
        : [...prev, item.id],
    );
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search media..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-32">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="image">Images</SelectItem>
              <SelectItem value="video">Videos</SelectItem>
              <SelectItem value="audio">Audio</SelectItem>
              <SelectItem value="document">Documents</SelectItem>
            </SelectContent>
          </Select>
          <Select value={`${sortField}-${sortDir}`} onValueChange={(v) => {
            const [field, dir] = v.split("-") as [SortField, "asc" | "desc"];
            setSortField(field);
            setSortDir(dir);
          }}>
            <SelectTrigger className="w-36">
              <ArrowUpDown className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">Newest First</SelectItem>
              <SelectItem value="date-asc">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="size-desc">Largest First</SelectItem>
              <SelectItem value="size-asc">Smallest First</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "grid" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode("grid")}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={() => setViewMode("list")}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ScreenOptions
            columns={[
              { id: "name", label: "Name" },
              { id: "type", label: "Type" },
              { id: "size", label: "Size" },
              { id: "date", label: "Date" },
            ]}
          />
          <Button onClick={() => setShowUpload(!showUpload)}>
            <Upload className="h-4 w-4 mr-2" />
            Upload
          </Button>
        </div>
      </div>

      {showUpload && (
        <MediaUpload
          onUploadComplete={(files) => {
            setTimeout(() => setShowUpload(false), 1000);
          }}
        />
      )}

      <MediaGrid
        items={filtered}
        onSelect={handleSelect}
        selected={selected}
        viewMode={viewMode}
      />

      {filtered.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <p>No media found</p>
        </div>
      )}

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filtered.length} of {mockMedia.length} items
        </span>
      </div>

      <Dialog
        open={!!editItem}
        onOpenChange={(o) => !o && setEditItem(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Media</DialogTitle>
            <DialogDescription>
              Update media details and metadata.
            </DialogDescription>
          </DialogHeader>
          {editItem && (
            <div className="grid gap-6 py-4">
              <div className="flex gap-6">
                <div className="w-48 h-48 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                  {editItem.mimeType.startsWith("image/") ? (
                    <img
                      src={editItem.url}
                      alt={editItem.altText || editItem.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Title</label>
                    <Input defaultValue={editItem.name} />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Alt Text</label>
                    <Input
                      defaultValue={editItem.altText || ""}
                      placeholder="Describe the image for accessibility"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Caption</label>
                    <Input
                      defaultValue={editItem.caption || ""}
                      placeholder="Image caption"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Description</label>
                    <textarea
                      className="flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      defaultValue={editItem.description || ""}
                      placeholder="Optional description"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">File size:</span>{" "}
                  {formatBytes(editItem.size)}
                </div>
                <div>
                  <span className="text-muted-foreground">Type:</span>{" "}
                  {editItem.mimeType}
                </div>
                {editItem.width && editItem.height && (
                  <div>
                    <span className="text-muted-foreground">Dimensions:</span>{" "}
                    {editItem.width} x {editItem.height}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium">
                  Focal Point
                </label>
                <p className="text-xs text-muted-foreground">
                  Click to set the focal point for cropping.
                </p>
                <div className="relative w-48 h-32 bg-muted rounded-md overflow-hidden cursor-crosshair">
                  <img
                    src={editItem.url}
                    alt="Focal point selector"
                    className="w-full h-full object-cover"
                  />
                  {editItem.focalPoint && (
                    <div
                      className="absolute w-4 h-4 bg-primary rounded-full border-2 border-white -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${editItem.focalPoint.x * 100}%`,
                        top: `${editItem.focalPoint.y * 100}%`,
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditItem(null)}>
                  Cancel
                </Button>
                <Button>Save Changes</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
