import { Module } from '@nestjs/common';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentTypesController } from './content-types.controller';
import { ContentTypesService } from './content-types.service';
import { RevisionsController } from './revisions.controller';
import { BulkActionsController } from './bulk.controller';
import { BulkActionsService } from './bulk-actions.service';

@Module({
  controllers: [
    ContentController,
    ContentTypesController,
    RevisionsController,
    BulkActionsController,
  ],
  providers: [ContentService, ContentTypesService, BulkActionsService],
  exports: [ContentService, ContentTypesService, BulkActionsService],
})
export class ContentModule {}
