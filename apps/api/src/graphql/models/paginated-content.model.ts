import { ObjectType, Field, Int } from '@nestjs/graphql';
import { ContentEntryType } from './content-entry.model';

@ObjectType()
export class PaginatedContent {
  @Field(() => [ContentEntryType])
  items: ContentEntryType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
