import { Resolver, Query, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ContentService } from '../../content/content.service';
import { ContentTypesService } from '../../content/content-types.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ContentEntryType } from '../models/content-entry.model';
import { ContentTypeType } from '../models/content-type.model';
import { PaginatedContent } from '../models/paginated-content.model';

@Resolver()
export class ContentResolver {
  constructor(
    private contentService: ContentService,
    private contentTypesService: ContentTypesService,
  ) {}

  @Query(() => ContentEntryType)
  @Public()
  async contentEntry(@Args('id') id: string) {
    return this.contentService.findById(id);
  }

  @Query(() => PaginatedContent)
  @Public()
  async contentEntries(
    @Args('type') type: string,
    @Args('page', { nullable: true, defaultValue: 1 }) page: number,
    @Args('limit', { nullable: true, defaultValue: 20 }) limit: number,
    @Args('status', { nullable: true }) status?: string,
  ) {
    return this.contentService.findByType(type, status, page, limit);
  }

  @Query(() => [ContentTypeType])
  @Public()
  async contentTypes() {
    return this.contentTypesService.findAll();
  }

  @Mutation(() => ContentEntryType)
  @UseGuards(JwtAuthGuard)
  async createContent(@Args('type') type: string, @Args('data') data: string, @Context() ctx: any) {
    const parsed = JSON.parse(data);
    return this.contentService.create(type, parsed, ctx.req.user.sub);
  }

  @Mutation(() => ContentEntryType)
  @UseGuards(JwtAuthGuard)
  async updateContent(@Args('id') id: string, @Args('data') data: string) {
    const parsed = JSON.parse(data);
    return this.contentService.update(id, parsed);
  }

  @Mutation(() => Boolean)
  @UseGuards(JwtAuthGuard)
  async deleteContent(@Args('id') id: string) {
    await this.contentService.delete(id);
    return true;
  }
}
