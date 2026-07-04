import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentTypesController } from './content-types.controller';
import { ContentTypesService } from './content-types.service';
import { RevisionsController } from './revisions.controller';
import { BulkModule } from './bulk.module';

@Module({
  imports: [BulkModule],
  controllers: [ContentController, ContentTypesController, RevisionsController],
  providers: [ContentService, ContentTypesService],
  exports: [ContentService, ContentTypesService],
})
export class ContentModule {}
