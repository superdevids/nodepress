import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import * as sharp from 'sharp';
import * as path from 'path';
import * as fs from 'fs/promises';

@Injectable()
export class ImageProcessorService {
  private uploadDir = process.env.UPLOAD_DIR || './uploads';

  async processImage(filePath: string, mediaId: string): Promise<Record<string, string>> {
    const sizes: Record<string, string> = {};
    const image = sharp(filePath);
    const metadata = await image.metadata();
    const ext = path.extname(filePath) || '.jpg';
    const baseName = path.basename(filePath, ext);

    const sizeConfigs = [
      { name: 'thumbnail', width: 150, height: 150 },
      { name: 'medium', width: 300, height: 300 },
      { name: 'large', width: 1024, height: 1024 },
    ];

    for (const size of sizeConfigs) {
      const resizedPath = path.join(this.uploadDir, 'resized', `${baseName}-${size.name}${ext}`);
      await fs.mkdir(path.dirname(resizedPath), { recursive: true });

      await image
        .clone()
        .resize(size.width, size.height, { fit: 'cover', position: 'center' })
        .toFile(resizedPath);

      sizes[size.name] = `/uploads/resized/${baseName}-${size.name}${ext}`;
    }

    await this.prisma.media.update({
      where: { id: mediaId },
      data: {
        sizes,
        width: metadata?.width || 0,
        height: metadata?.height || 0,
      },
    });

    return sizes;
  }
}
