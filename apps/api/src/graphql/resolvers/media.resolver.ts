import { Resolver, Query, Args } from '@nestjs/graphql';
import { MediaService } from '../../media/media.service';
import { Public } from '../../common/decorators/public.decorator';

@Resolver()
export class MediaResolver {
  constructor(private mediaService: MediaService) {}

  @Query(() => String)
  @Public()
  async mediaList(
    @Args('page', { nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit: number,
  ) {
    const result = await this.mediaService.findAll(page, limit);
    return JSON.stringify(result);
  }

  @Query(() => String)
  @Public()
  async mediaItem(@Args('id') id: string) {
    const result = await this.mediaService.findById(id);
    return JSON.stringify(result);
  }
}
