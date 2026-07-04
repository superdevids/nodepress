import { Module, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { ImageProcessorService } from './image-processor.service';
import { ImageProcessorWorker } from './image-processor.worker';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService, ImageProcessorService, ImageProcessorWorker],
  exports: [MediaService, ImageProcessorService],
})
export class MediaModule implements OnApplicationBootstrap {
  private readonly logger = new Logger(MediaModule.name);

  constructor(private readonly worker: ImageProcessorWorker) {}

  onApplicationBootstrap() {
    // The worker is instantiated by DI and starts listening automatically.
    // This hook ensures the worker is ready after all modules are loaded.
    this.logger.log('Image processing worker initialized');
  }
}
