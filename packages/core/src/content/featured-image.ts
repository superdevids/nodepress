import type { CacheService } from "../cache/cache-service.js";

export interface FeaturedImageData {
  id: string;
  url: string;
  alt: string;
  caption: string;
  sizes: Record<string, string>;
  width: number | null;
  height: number | null;
}

export interface ThumbnailSize {
  name: string;
  width: number;
  height: number;
  crop: boolean;
}

const DEFAULT_THUMBNAIL_SIZES: ThumbnailSize[] = [
  { name: "thumbnail", width: 150, height: 150, crop: true },
  { name: "medium", width: 300, height: 300, crop: false },
  { name: "medium_large", width: 768, height: 0, crop: false },
  { name: "large", width: 1024, height: 1024, crop: false },
  { name: "full", width: 0, height: 0, crop: false },
];

export class FeaturedImage {
  private thumbnailSizes: ThumbnailSize[];
  private cache: CacheService | null;

  constructor(cache?: CacheService) {
    this.thumbnailSizes = [...DEFAULT_THUMBNAIL_SIZES];
    this.cache = cache ?? null;
  }

  setCache(cache: CacheService): void {
    this.cache = cache;
  }

  getThumbnailSizes(): ThumbnailSize[] {
    return [...this.thumbnailSizes];
  }

  addThumbnailSize(size: ThumbnailSize): void {
    const idx = this.thumbnailSizes.findIndex((s) => s.name === size.name);
    if (idx >= 0) {
      this.thumbnailSizes[idx] = size;
    } else {
      this.thumbnailSizes.push(size);
    }
  }

  removeThumbnailSize(name: string): void {
    this.thumbnailSizes = this.thumbnailSizes.filter((s) => s.name !== name);
  }

  async setFeaturedImage(
    entryId: string,
    mediaId: string,
    getMedia: (id: string) => Promise<FeaturedImageData | null>,
  ): Promise<FeaturedImageData | null> {
    const media = await getMedia(mediaId);
    if (!media) return null;

    if (this.cache) {
      await this.cache.set(`featured:${entryId}`, media, { tags: ["featured-image", `entry:${entryId}`] });
    }

    return media;
  }

  async getFeaturedImage(
    entryId: string,
    getMedia: (id: string) => Promise<FeaturedImageData | null>,
    featuredImageId?: string | null,
  ): Promise<FeaturedImageData | null> {
    if (!featuredImageId) return null;

    if (this.cache) {
      const cached = await this.cache.get<FeaturedImageData>(`featured:${entryId}`);
      if (cached) return cached;
    }

    const media = await getMedia(featuredImageId);
    if (media && this.cache) {
      await this.cache.set(`featured:${entryId}`, media, { tags: ["featured-image", `entry:${entryId}`] });
    }

    return media;
  }

  async removeFeaturedImage(entryId: string): Promise<void> {
    if (this.cache) {
      await this.cache.delete(`featured:${entryId}`);
    }
  }

  getImageUrl(size: ThumbnailSize, baseUrl: string): string {
    if (size.name === "full" || (!size.width && !size.height)) {
      return baseUrl;
    }
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}size=${size.name}&w=${size.width}&h=${size.height}&crop=${size.crop}`;
  }

  generateThumbnailUrls(baseUrl: string): Record<string, string> {
    const sizes: Record<string, string> = {};
    for (const size of this.thumbnailSizes) {
      sizes[size.name] = this.getImageUrl(size, baseUrl);
    }
    return sizes;
  }

  getFallbackImage(): FeaturedImageData {
    return {
      id: "",
      url: "/images/placeholder.png",
      alt: "Placeholder image",
      caption: "",
      sizes: {},
      width: null,
      height: null,
    };
  }
}
