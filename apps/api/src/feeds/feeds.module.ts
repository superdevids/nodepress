import { Module } from '@nestjs/common';
import { FeedsController } from './feeds.controller';
import { FeedsService } from './feeds.service';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [FeedsController],
  providers: [FeedsService],
  exports: [FeedsService],
})
export class FeedsModule {}
