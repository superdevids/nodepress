import { Resolver, Query, Args } from '@nestjs/graphql';
import { MediaService } from '../../media/media.service';
import { Public } from '../../common/decorators/public.decorator';
import { MediaType } from '../models/media.model';
import { PaginatedMedia } from '../models/paginated-media.model';

@Resolver()
export class MediaResolver {
  constructor(private mediaService: MediaService) {}

  @Query(() => PaginatedMedia)
  @Public()
  async mediaList(
    @Args('page', { nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit: number,
  ) {
    return this.mediaService.findAll(page, limit);
  }

  @Query(() => MediaType)
  @Public()
  async mediaItem(@Args('id') id: string) {
    return this.mediaService.findById(id);
  }
}
