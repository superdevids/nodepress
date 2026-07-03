"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useParams } from "next/navigation";
import { formatDate, formatBytes } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";

export default function MediaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { success } = useToast();
  const id = params.id as string;

  const [altText, setAltText] = React.useState("");
  const [caption, setCaption] = React.useState("");
  const [description, setDescription] = React.useState("");

  const mockItem = {
    id,
    name: "hero-banner.jpg",
    url: "/mock/hero.jpg",
    mimeType: "image/jpeg",
    size: 245000,
    width: 1920,
    height: 1080,
    createdAt: new Date("2026-07-01"),
    altText: "Hero banner showcasing NodePress",
  };

  const handleSave = () => {
    success("Media updated", "Changes saved successfully.");
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/admin/media")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {mockItem.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              Media ID: {id}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-1.5" />
            Download
          </Button>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-1.5" />
            View
          </Button>
          <Button variant="destructive" size="sm">
            <Trash2 className="h-4 w-4 mr-1.5" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <div className="rounded-lg bg-muted flex items-center justify-center overflow-hidden aspect-video">
            <img
              src={mockItem.url}
              alt={mockItem.altText || mockItem.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="mt-4 space-y-1.5">
            <Label>URL</Label>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted px-2 py-1.5 rounded">
                /uploads/2026/07/{mockItem.name}
              </code>
              <Button variant="ghost" size="sm" className="h-7">
                Copy
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="alt-text">Alt Text</Label>
            <Input
              id="alt-text"
              value={altText}
              onChange={(e) => setAltText(e.target.value)}
              placeholder="Describe the image for accessibility"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="caption">Caption</Label>
            <Input
              id="caption"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Optional caption"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              className="min-h-[100px]"
            />
          </div>

          <Separator />

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">File name</span>
              <span>{mockItem.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File type</span>
              <Badge variant="outline">{mockItem.mimeType}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">File size</span>
              <span>{formatBytes(mockItem.size)}</span>
            </div>
            {mockItem.width && mockItem.height && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Dimensions</span>
                <span>
                  {mockItem.width} x {mockItem.height}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Uploaded on</span>
              <span>{formatDate(mockItem.createdAt)}</span>
            </div>
          </div>

          <Button className="w-full" onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  );
}
