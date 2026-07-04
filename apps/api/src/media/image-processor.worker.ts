import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Job, Worker } from 'bullmq';
import { PrismaService } from '../common/prisma.service';
import { ImageProcessorService } from './image-processor.service';
import * as path from 'path';

/**
 * BullMQ worker that processes image processing jobs from the 'image-processing' queue.
 * Runs in the same Node.js process for simplicity; can be extracted to a separate
 * process if throughput demands it.
 */
@Injectable()
export class ImageProcessorWorker implements OnModuleDestroy {
  private readonly logger = new Logger(ImageProcessorWorker.name);
  private worker: Worker;

  constructor(
    private readonly prisma: PrismaService,
    private readonly imageProcessor: ImageProcessorService,
  ) {
    this.worker = new Worker<{ mediaId: string }>(
      'image-processing',
      async (job: Job<{ mediaId: string }>) => {
        await this.process(job);
      },
      {
        connection: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379', 10),
        },
        concurrency: 3, // Process up to 3 images simultaneously
        limiter: {
          max: 10, // Max 10 jobs per second
          duration: 1000,
        },
      },
    );

    this.worker.on('completed', (job: Job) => {
      this.logger.log(`Job ${job.id} completed for media ${job.data.mediaId}`);
    });

    this.worker.on('failed', (job: Job | undefined, error: Error) => {
      if (job) {
        this.logger.error(
          `Job ${job.id} failed for media ${job.data.mediaId}: ${error.message}`,
          error.stack,
        );
      }
    });

    this.worker.on('error', (error: Error) => {
      this.logger.error(`Worker error: ${error.message}`, error.stack);
    });

    this.logger.log('Image processing worker started');
  }

  /**
   * Process an image processing job:
   * 1. Fetch the media record from DB
   * 2. Resolve the file path on disk
   * 3. Call ImageProcessorService to generate thumbnails and WebP variants
   * 4. Handle errors gracefully
   */
  private async process(job: Job<{ mediaId: string }>): Promise<void> {
    const { mediaId } = job.data;

    // Fetch the media record
    const media = await this.prisma.media.findUnique({ where: { id: mediaId } });
    if (!media) {
      throw new Error(`Media ${mediaId} not found`);
    }

    // Only process images
    if (!media.mimeType.startsWith('image/')) {
      this.logger.warn(`Skipping non-image media ${mediaId}: ${media.mimeType}`);
      return;
    }

    // Resolve the file path from the URL
    // The URL is stored as `/uploads/<filename>` — map it to the filesystem path
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    const fileName = media.url.replace('/uploads/', '');
    const filePath = path.join(uploadDir, fileName);

    try {
      await this.imageProcessor.processImage(filePath, mediaId);
    } catch (error) {
      this.logger.error(
        `Failed to process image ${mediaId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      throw error; // Let BullMQ handle retries
    }
  }

  /**
   * Gracefully shut down the worker when the module is destroyed.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log('Shutting down image processing worker...');
    await this.worker.close();
    this.logger.log('Image processing worker stopped');
  }
}
