"use client";

import * as React from "react";
import { MediaBrowser } from "@/components/media/media-browser";

export default function MediaPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Media Library</h1>
        <p className="text-muted-foreground mt-1">
          Upload, browse, and manage your media files.
        </p>
      </div>

      <MediaBrowser />
    </div>
  );
}
