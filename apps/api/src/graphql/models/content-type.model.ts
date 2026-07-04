import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class ContentTypeType {
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
