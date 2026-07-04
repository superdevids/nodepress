import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class ChangePasswordResult {
  @Field()
  success: boolean;
}
