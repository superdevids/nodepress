/**
 * NodePress API Helper
 *
 * ⚠️ DEPRECATED — This module is maintained for backward compatibility only.
 * New code should import `useApi` from `@/lib/use-api` directly.
 *
 * This file re-exports from the canonical `@/lib/use-api`.
 */

export { useApi } from './use-api';
export type { ApiResponse, ApiMeta } from './use-api';
export { ApiClient, getApiClient, createApiClient, ApiClientError } from './api-client';
export type { ApiError, ApiClientOptions } from './api-client';
