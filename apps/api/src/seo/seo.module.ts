import { Module } from '@nestjs/common';
import { SeoController } from './seo.controller';
import { SeoApiService } from './seo-api.service';
import { ContentModule } from '../content/content.module';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [ContentModule, SettingsModule],
  controllers: [SeoController],
  providers: [SeoApiService],
  exports: [SeoApiService],
})
export class SeoModule {}
