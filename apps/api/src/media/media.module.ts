import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
    }),
  ],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
