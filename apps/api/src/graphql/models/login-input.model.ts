import { InputType, Field } from '@nestjs/graphql';
import { IsEmail, IsString, MinLength } from 'class-validator';

/**
 * GraphQL input type for user login.
 *
 * Provides the same validation as the REST LoginDto but using
 * GraphQL's InputType system so that field-level constraints
 * are enforced by the GraphQL pipe at runtime.
 */
@InputType()
export class LoginInput {
  @Field()
  @IsEmail({}, { message: 'A valid email address is required' })
  email!: string;

  @Field()
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  password!: string;
}
