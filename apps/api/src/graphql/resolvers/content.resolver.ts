import { Resolver, Query, Mutation, Args, Int, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { ContentService } from '../../content/content.service';
import { ContentTypesService } from '../../content/content-types.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
class ContentEntry {
  @Field(() => ID)
  id: string;

  @Field()
  type: string;

  @Field()
  title: string;

  @Field()
  slug: string;

  @Field()
  content: string;

  @Field({ nullable: true })
  excerpt?: string;

  @Field()
  status: string;

  @Field(() => Boolean)
  featured: boolean;

  @Field(() => [String])
  tags: string[];

  @Field(() => String, { nullable: true })
  parentId?: string;

  @Field()
  authorId: string;

  @Field(() => Int)
  viewCount: number;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;

  @Field({ nullable: true })
  publishedAt?: Date;
}

@ObjectType()
class ContentType {
  @Field(() => ID)
  id: string;

  @Field()
  name: string;

  @Field()
  slug: string;

  @Field()
  description: string;

  @Field(() => [String])
  supports: string[];

  @Field()
  createdAt: Date;
}

@ObjectType()
class PaginatedContent {
  @Field(() => [ContentEntry])
  items: ContentEntry[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}

@Resolver(() => ContentEntry)
export class ContentResolver {
  constructor(
    private contentService: ContentService,
    private contentTypesService: ContentTypesService,
  ) {}

  @Query(() => ContentEntry)
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

  @Query(() => [ContentType])
  @Public()
  async contentTypes() {
    const types = await this.contentTypesService.findAll();
    return types.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      description: t.description,
      supports: t.supports,
      createdAt: t.createdAt,
    }));
  }

  @Mutation(() => ContentEntry)
  @UseGuards(JwtAuthGuard)
  async createContent(
    @Args('type') type: string,
    @Args('data') data: string,
    @Context() ctx: any,
  ) {
    const parsed = JSON.parse(data);
    return this.contentService.create(type, parsed, ctx.req.user.sub);
  }

  @Mutation(() => ContentEntry)
  @UseGuards(JwtAuthGuard)
  async updateContent(
    @Args('id') id: string,
    @Args('data') data: string,
  ) {
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
