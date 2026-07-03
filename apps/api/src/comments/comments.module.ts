import { Module } from '@nestjs/common';
import { CommentsController } from './comments.controller';
import { CommentsService } from './comments.service';
import { PingbackService } from './pingback.service';

@Module({
  controllers: [CommentsController],
  providers: [CommentsService, PingbackService],
  exports: [CommentsService, PingbackService],
})
export class CommentsModule {}
