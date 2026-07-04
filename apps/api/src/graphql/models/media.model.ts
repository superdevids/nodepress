import { ObjectType, Field, ID, Int } from '@nestjs/graphql';

@ObjectType()
export class MediaType {
  @Field(() => ID)
  id: string;

  @Field()
  filename: string;

  @Field()
  originalName: string;

  @Field()
  mimeType: string;

  @Field(() => Int)
  size: number;

  @Field(() => Int, { nullable: true })
  width?: number;

  @Field(() => Int, { nullable: true })
  height?: number;

  @Field()
  alt: string;

  @Field()
  caption: string;

  @Field()
  url: string;

  @Field({ nullable: true })
  thumbnailUrl?: string;

  @Field()
  uploadedBy: string;

  @Field()
  createdAt: Date;
}
