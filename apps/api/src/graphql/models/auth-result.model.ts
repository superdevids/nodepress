import { ObjectType, Field } from '@nestjs/graphql';

@ObjectType()
export class AuthResult {
  @Field()
  accessToken: string;

  @Field()
  refreshToken: string;

  @Field()
  sessionId: string;

  @Field({ nullable: true, defaultValue: false })
  requires2fa?: boolean;
}
