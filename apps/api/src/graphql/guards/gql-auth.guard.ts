import { Injectable, ExecutionContext } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { GqlExecutionContext } from '@nestjs/graphql';

/**
 * GraphQL-specific JWT authentication guard.
 *
 * Extends Passport's AuthGuard('jwt') and overrides getRequest()
 * to properly extract the Express request from the GraphQL execution
 * context — which is required because GraphQL resolvers run inside
 * a different execution context than REST endpoints.
 *
 * Usage:
 * ```ts
 * &#64;UseGuards(GqlAuthGuard)
 * &#64;Mutation(() => ChangePasswordResult)
 * async changePassword(...) { ... }
 * ```
 */
@Injectable()
export class GqlAuthGuard extends AuthGuard('jwt') {
  getRequest(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req;
  }
}
