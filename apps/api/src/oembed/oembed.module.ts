import { Module } from '@nestjs/common';
import { OEmbedController } from './oembed.controller';
import { OEmbedService } from './oembed.service';

@Module({
  controllers: [OEmbedController],
  providers: [OEmbedService],
  exports: [OEmbedService],
})
export class OEmbedModule {}
