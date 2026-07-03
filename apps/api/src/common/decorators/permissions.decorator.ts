import { SetMetadata } from "@nestjs/common";

export const PERMISSIONS_KEY = "permissions";
export type PermissionAction =
  "create" | "read" | "update" | "delete" | "publish" | "manage";

/**
 * Declares the permissions required to access a route handler.
 *
 * Usage:
 * ```ts
 * &#64;Permissions('create', 'post')
 * &#64;Post('content/post')
 * createPost(@Body() dto: CreateContentDto) { ... }
 * ```
 */
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
