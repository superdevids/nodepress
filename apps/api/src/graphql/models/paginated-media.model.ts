import { ObjectType, Field, Int } from '@nestjs/graphql';
import { MediaType } from './media.model';

@ObjectType()
export class PaginatedMedia {
  @Field(() => [MediaType])
  items: MediaType[];

  @Field(() => Int)
  total: number;

  @Field(() => Int)
  page: number;

  @Field(() => Int)
  limit: number;
}
