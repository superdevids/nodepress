import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class ContentEntryType {
  @Field(() => ID)
  id: string;

  @Field()
  type: string;

  @Field()
  title: string;

  @Field()
  slug: string;

  @Field({ nullable: true })
  content?: string;

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
