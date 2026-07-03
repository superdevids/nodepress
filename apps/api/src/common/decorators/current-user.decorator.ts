import { createParamDecorator, ExecutionContext } from "@nestjs/common";

/**
 * Extracts the authenticated user from the request object.
 *
 * Usage:
 * ```ts
 * &#64;Get('me')
 * me(@CurrentUser() user: JwtPayload) { ... }
 * ```
 *
 * Optionally returns a specific property:
 * ```ts
 * &#64;CurrentUser('id') userId: string
 * ```
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user;
    return data ? user?.[data] : user;
  },
);
