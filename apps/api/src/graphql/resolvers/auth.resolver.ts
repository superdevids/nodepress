import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { AuthService } from '../../auth/auth.service';
import { Public } from '../../common/decorators/public.decorator';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => String)
  @Public()
  async login(
    @Args('email') email: string,
    @Args('password') password: string,
  ) {
    const result = await this.authService.login({ email, password });
    return JSON.stringify(result);
  }

  @Mutation(() => String)
  @Public()
  async refreshToken(@Args('refreshToken') refreshToken: string) {
    const result = await this.authService.refresh(refreshToken);
    return JSON.stringify(result);
  }

  @Mutation(() => String)
  @Public()
  async register(
    @Args('email') email: string,
    @Args('password') password: string,
    @Args('firstName', { nullable: true }) firstName?: string,
    @Args('lastName', { nullable: true }) lastName?: string,
    @Args('username', { nullable: true }) username?: string,
  ) {
    const result = await this.authService.register({ email, password, firstName, lastName, username });
    return JSON.stringify(result);
  }

  @Mutation(() => String)
  @Public()
  async changePassword(
    @Args('userId') userId: string,
    @Args('currentPassword') currentPassword: string,
    @Args('newPassword') newPassword: string,
  ) {
    const result = await this.authService.changePassword(userId, currentPassword, newPassword);
    return JSON.stringify(result);
  }

  @Query(() => String)
  @Public()
  async profile(@Args('userId') userId: string) {
    const result = await this.authService.getProfile(userId);
    return JSON.stringify(result);
  }
}
