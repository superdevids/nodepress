import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { Queue } from 'bullmq';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class ImageProcessorService {
  private readonly logger = new Logger(ImageProcessorService.name);
  private uploadDir = process.env.UPLOAD_DIR || './uploads';
  private queue: Queue;

  constructor(private readonly prisma: PrismaService) {
    this.queue = new Queue('image-processing', {
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: { age: 3600 * 24 }, // Keep completed jobs for 24h
        removeOnFail: { age: 3600 * 24 * 7 }, // Keep failed jobs for 7d
      },
    });
  }

  /**
   * Enqueue an image processing job for the given media ID.
   */
  async addToQueue(mediaId: string): Promise<void> {
    await this.queue.add(
      'process-image',
      { mediaId },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    );
    this.logger.log(`Image processing queued for media ${mediaId}`);
  }

  /**
   * Process an image: generate thumbnails, WebP versions, and update the media record.
   * This is the core processing logic — called by the worker.
   */
  async processImage(filePath: string, mediaId: string): Promise<Record<string, string>> {
    const sizes: Record<string, string> = {};
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const ext = '.jpg'; // Always convert originals to JPEG for resized variants
    const baseName = path.basename(filePath, path.extname(filePath));

    const sizeConfigs = [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 1024, height: 1024 },
    ];

    // Ensure output directories exist
    const resizedDir = path.join(this.uploadDir, 'resized');
    const webpDir = path.join(this.uploadDir, 'webp');
    await fs.mkdir(resizedDir, { recursive: true });
    await fs.mkdir(webpDir, { recursive: true });

    for (const size of sizeConfigs) {
      // --- JPEG resized version ---
      const resizedPath = path.join(resizedDir, `${baseName}-${size.name}${ext}`);
      await image
        .clone()
        .resize(size.width, size.height, { fit: 'cover', position: 'center' })
        .jpeg({ quality: 85 })
        .toFile(resizedPath);
      sizes[size.name] = `/uploads/resized/${baseName}-${size.name}${ext}`;

      // --- WebP version of each size ---
      const webpPath = path.join(webpDir, `${baseName}-${size.name}.webp`);
      await image
        .clone()
        .resize(size.width, size.height, { fit: 'cover', position: 'center' })
        .webp({ quality: 80 })
        .toFile(webpPath);
      sizes[`${size.name}-webp`] = `/uploads/webp/${baseName}-${size.name}.webp`;
    }

    // Also generate a full-size WebP version
    const fullWebpPath = path.join(webpDir, `${baseName}.webp`);
    await image.clone().webp({ quality: 80 }).toFile(fullWebpPath);
    sizes['full-webp'] = `/uploads/webp/${baseName}.webp`;

    // Build the sizes map with all variants
    const allSizes: Record<string, string> = {};
    for (const [key, url] of Object.entries(sizes)) {
      allSizes[key] = url;
    }

    // Update the media record with generated sizes and dimensions
    await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        sizes: allSizes,
        width: metadata?.width || 0,
        height: metadata?.height || 0,
      },
    });

    this.logger.log(
      `Image processed for media ${mediaId}: ${Object.keys(allSizes).length} variants generated`,
    );
    return allSizes;
  }
}
