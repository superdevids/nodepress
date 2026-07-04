import { ObjectType, Field, ID } from '@nestjs/graphql';

@ObjectType()
export class UserType {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field()
  username: string;

  @Field()
  role: string;

  @Field(() => [String])
  permissions: string[];

  @Field({ nullable: true })
  avatarUrl?: string;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}
