import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';

@Module({
  imports: [
    MulterModule.register({
      dest: './uploads',
      limits: { fileSize: 500 * 1024 * 1024 }, // 500 MB
    }),
  ],
  controllers: [ImportController],
  providers: [ImportService],
  exports: [ImportService],
})
export class ImportModule {}
