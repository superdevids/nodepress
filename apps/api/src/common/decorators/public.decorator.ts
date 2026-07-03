import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "isPublic";

/**
 * Marks a route handler as publicly accessible — no JWT authentication
 * is required.
 *
 * Usage:
 * ```ts
 * &#64;Public()
 * &#64;Post('register')
 * register(@Body() dto: RegisterDto) { ... }
 * ```
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
