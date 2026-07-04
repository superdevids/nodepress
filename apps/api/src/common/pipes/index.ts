/**
 * NodePress validation pipes.
 *
 * This module exports a custom ValidationPipe built on
 * class-validator + class-transformer. It is **not** wired
 * by default — main.ts uses NestJS's built-in ValidationPipe
 * instead.
 *
 * To switch to this custom pipe, replace the built-in usage in
 * main.ts:
 *
 * ```ts
 * // Before:
 * app.useGlobalPipes(new ValidationPipe({ whitelist: true, ... }));
 *
 * // After:
 * import { ValidationPipe } from './common/pipes';
 * app.useGlobalPipes(new ValidationPipe());
 * ```
 *
 * The custom pipe provides:
 * - Automatic transformation via plainToInstance
 * - Whitelisting with forbidNonWhitelisted support
 * - Flattened, human-readable error messages with property paths
 * - Recursive child-validation error reporting
 */
export { ValidationPipe } from './validation.pipe';
