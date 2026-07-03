import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, writeFileSync, createReadStream } from "node:fs";
import { join, extname } from "node:path";

export interface ImageSize {
  name: string;
  width: number;
  height: number;
  crop: boolean;
}

export interface MediaUploadOptions {
  filename: string;
  mimeType: string;
  buffer: Buffer;
  altText?: string;
  caption?: string;
  uploadedBy: string;
}

export interface MediaResult {
  id: string;
  url: string;
  sizes: Record<string, string>;
  mimeType: string;
  altText: string | null;
  caption: string | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
}

export class MediaService {
  private defaultSizes: ImageSize[] = [
    { name: "thumbnail", width: 150, height: 150, crop: true },
    { name: "medium", width: 300, height: 300, crop: false },
    { name: "large", width: 1024, height: 1024, crop: false },
  ];

  /**
   * Upload a file to the media library.
   */
  async upload(options: MediaUploadOptions): Promise<MediaResult> {
    const id = randomUUID();
    const ext = extname(options.filename) || ".bin";
    const basename = `${id}${ext}`;
    const uploadDir = process.env.MEDIA_DIR || join(process.cwd(), "uploads");
    if (!existsSync(uploadDir)) {
      mkdirSync(uploadDir, { recursive: true });
    }

    const filePath = join(uploadDir, basename);
    writeFileSync(filePath, options.buffer);

    const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
    const url = `${appUrl}/uploads/${basename}`;

    let width: number | null = null;
    let height: number | null = null;
    const sizes: Record<string, string> = { full: url };

    if (options.mimeType.startsWith("image/")) {
      try {
        const sharp = (await import("sharp")).default;
        const metadata = await sharp(options.buffer).metadata();
        width = metadata.width ?? null;
        height = metadata.height ?? null;

        for (const size of this.getImageSizes()) {
          if (width && height && width <= size.width && height <= size.height) {
            sizes[size.name] = url;
            continue;
          }
          const resized = await sharp(options.buffer)
            .resize(size.width, size.height, { fit: size.crop ? "cover" : "inside" })
            .toBuffer();
          const resizedPath = join(uploadDir, `${id}-${size.name}${ext}`);
          writeFileSync(resizedPath, resized);
          sizes[size.name] = `${appUrl}/uploads/${id}-${size.name}${ext}`;
        }
      } catch {
        // sharp not available, skip image processing
      }
    }

    return {
      id,
      url,
      sizes,
      mimeType: options.mimeType,
      altText: options.altText ?? null,
      caption: options.caption ?? null,
      width,
      height,
      fileSize: options.buffer.length,
    };
  }

  /**
   * Get the URL for a given file.
   */
  getUrl(filename: string): string {
    const appUrl = (process.env.APP_URL || "http://localhost:3000").replace(/\/+$/, "");
    return `${appUrl}/uploads/${filename}`;
  }

  /**
   * Generate a thumbnail URL from a source buffer.
   */
  async generateThumbnail(buffer: Buffer, size: number = 150): Promise<Buffer | null> {
    try {
      const sharp = (await import("sharp")).default;
      return await sharp(buffer)
        .resize(size, size, { fit: "cover" })
        .toBuffer();
    } catch {
      return null;
    }
  }

  /**
   * Get configured image sizes.
   */
  getImageSizes(): ImageSize[] {
    const envSizes = process.env.MEDIA_IMAGE_SIZES;
    if (envSizes) {
      try {
        return JSON.parse(envSizes) as ImageSize[];
      } catch {
        // Fall back to defaults
      }
    }
    return this.defaultSizes;
  }

  /**
   * Register a custom image size (add_image_size equivalent).
   */
  registerImageSize(size: ImageSize): void {
    const idx = this.defaultSizes.findIndex((s) => s.name === size.name);
    if (idx >= 0) {
      this.defaultSizes[idx] = size;
    } else {
      this.defaultSizes.push(size);
    }
  }

  /**
   * Validate file MIME type against allowed types.
   */
  validateMimeType(mimeType: string): boolean {
    const allowed = process.env.MEDIA_ALLOWED_TYPES?.split(",") ?? [
      "image/jpeg", "image/png", "image/webp", "image/gif",
      "video/mp4", "application/pdf",
    ];
    return allowed.includes(mimeType);
  }

  /**
   * Validate file size.
   */
  validateFileSize(bytes: number): boolean {
    const maxSize = parseInt(process.env.MEDIA_MAX_FILE_SIZE ?? "10485760", 10);
    return bytes <= maxSize;
  }
}
