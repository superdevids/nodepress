import { SetMetadata } from "@nestjs/common";
import { ROLES_KEY } from "../guards/capabilities.guard";

/**
 * Declares the roles required to access a route handler.
 *
 * Usage:
 * ```ts
 * @Roles('ADMIN', 'SUPER_ADMIN')
 * @Get('security-log')
 * query() { ... }
 * ```
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
