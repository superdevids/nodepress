import { Resolver, Mutation, Query, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AuthService } from '../../auth/auth.service';
import { UsersService } from '../../users/users.service';
import { Public } from '../../common/decorators/public.decorator';
import { AuthResult } from '../models/auth-result.model';
import { UserType } from '../models/user.model';
import { ChangePasswordResult } from '../models/change-password-result.model';
import { LoginInput } from '../models/login-input.model';
import { GqlAuthGuard } from '../guards/gql-auth.guard';

@Resolver()
export class AuthResolver {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
  ) {}

  @Mutation(() => AuthResult)
  @Public()
  async login(@Args('input') input: LoginInput) {
    // authService.login returns { accessToken, refreshToken, sessionId, requires2fa }
    return this.authService.login({ email: input.email, password: input.password });
  }

  @Mutation(() => AuthResult)
  @Public()
  async refreshToken(@Args('refreshToken') refreshToken: string) {
    return this.authService.refresh(refreshToken);
  }

  @Mutation(() => UserType)
  @Public()
  async register(
    @Args('email') email: string,
    @Args('password') password: string,
    @Args('firstName', { nullable: true }) firstName?: string,
    @Args('lastName', { nullable: true }) lastName?: string,
    @Args('username', { nullable: true }) username?: string,
  ) {
    // authService.register returns sanitized user from Prisma (id, email, name, displayName, role, capabilities, ...)
    // We need to map to UserType shape which uses firstName/lastName/username/permissions/avatarUrl
    const result: any = await this.authService.register({
      email,
      password,
      firstName,
      lastName,
      username,
    });
    return {
      id: result.id,
      email: result.email,
      firstName: result.name?.split(' ')[0] ?? '',
      lastName: result.name?.split(' ').slice(1).join(' ') ?? '',
      username: result.displayName ?? result.email?.split('@')[0] ?? '',
      role: result.role?.toLowerCase() ?? 'subscriber',
      permissions: result.capabilities ?? ['read'],
      avatarUrl: result.avatar ?? null,
      createdAt: result.createdAt,
      updatedAt: result.updatedAt,
    };
  }

  @Mutation(() => ChangePasswordResult)
  @UseGuards(GqlAuthGuard)
  async changePassword(
    @Args('userId') userId: string,
    @Args('currentPassword') currentPassword: string,
    @Args('newPassword') newPassword: string,
  ) {
    return this.authService.changePassword(userId, currentPassword, newPassword);
  }

  @Query(() => UserType)
  @UseGuards(GqlAuthGuard)
  async profile(@Args('userId') userId: string) {
    return this.usersService.findById(userId);
  }
}
