/**
 * NodePress API Helper
 *
 * ⚠️ DEPRECATED — This module is maintained for backward compatibility.
 * New code should import directly from `@/lib/api-client` instead.
 *
 * This file re-exports the canonical ApiClient from `api-client.ts` and
 * keeps the original helper functions and types for existing callers.
 */

export { ApiClient, getApiClient, createApiClient, ApiClientError } from './api-client';
export type { ApiResponse, ApiClientOptions } from './api-client';

// ─── Legacy types preserved for backward compatibility ─────

export interface ApiMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ContentEntry {
  id: string;
  title: string;
  slug: string;
  content?: string;
  excerpt?: string;
  status: 'draft' | 'published' | 'pending' | 'trashed';
  author?: { id: string; name: string; email?: string } | string;
  createdAt: string;
  updatedAt: string;
  type: string;
}

export interface ContentFormValues {
  title: string;
  slug?: string;
  content?: string;
  excerpt?: string;
  status?: 'draft' | 'published';
}

export class ApiError extends Error {
  public status: number;
  public details?: Record<string, string[]>;

  constructor(status: number, message: string, details?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

// ─── Legacy low-level fetch wrapper ────────────────────────

const BASE_URL =
  (typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_API_URL : process.env.API_URL) ??
  'http://localhost:3001/api';

async function request<T>(
  path: string,
  options: { method?: string; body?: unknown; token?: string | null } = {},
): Promise<{ data: T; meta?: ApiMeta }> {
  const { method = 'GET', body, token } = options;

  const url = `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(url, {
    method,
    headers,
    body:
      body && !(body instanceof FormData)
        ? JSON.stringify(body)
        : body instanceof FormData
          ? body
          : undefined,
    credentials: token ? undefined : 'include',
  });

  if (!response.ok) {
    let errorMessage = `API error ${response.status}`;
    let details: Record<string, string[]> | undefined;
    try {
      const errBody = await response.json();
      errorMessage = errBody.message ?? errBody.error ?? errorMessage;
      details = errBody.details;
    } catch {
      /* keep default */
    }
    throw new ApiError(response.status, errorMessage, details);
  }

  if (response.status === 204) {
    return { data: undefined as T };
  }

  const json = await response.json();

  // Handle both { data: T } and direct T response formats
  if (json !== null && typeof json === 'object' && 'data' in json) {
    return json as { data: T; meta?: ApiMeta };
  }

  return { data: json as T };
}

// ─── Hook-based API client (legacy) ────────────────────────

import { useAuth } from '@/lib/auth';

/**
 * Hook that returns a convenience API client reading the Bearer token
 * from AuthContext. Use this inside React components.
 *
 * ⚠️ DEPRECATED — Use `useApi()` from `@/lib/use-api` or import
 * `getApiClient()` from `@/lib/api-client` directly.
 */
export function useApi() {
  const { token } = useAuth();

  return {
    get: <T>(path: string) => request<T>(path, { method: 'GET', token }).then((r) => r.data),
    post: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'POST', body, token }).then((r) => r.data),
    put: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'PUT', body, token }).then((r) => r.data),
    patch: <T>(path: string, body?: unknown) =>
      request<T>(path, { method: 'PATCH', body, token }).then((r) => r.data),
    del: <T>(path: string) => request<T>(path, { method: 'DELETE', token }).then((r) => r.data),
  };
}

// ─── Content-specific helpers (standalone, no hook) ───────

export function fetchContentList(
  type: string,
  token: string | null,
  params?: { page?: number; pageSize?: number; status?: string },
) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.status) query.set('status', params.status);
  const qs = query.toString();
  return request<ContentEntry[]>(`/api/content/${type}${qs ? `?${qs}` : ''}`, { token });
}

export function fetchContentEntry(type: string, id: string, token: string | null) {
  return request<ContentEntry>(`/api/content/${type}/${id}`, { token });
}

export function createContentEntry(type: string, data: ContentFormValues, token: string | null) {
  return request<ContentEntry>(`/api/content/${type}`, {
    method: 'POST',
    body: data,
    token,
  });
}

export function updateContentEntry(
  type: string,
  id: string,
  data: Partial<ContentFormValues>,
  token: string | null,
) {
  return request<ContentEntry>(`/api/content/${type}/${id}`, {
    method: 'PATCH',
    body: data,
    token,
  });
}

export function deleteContentEntry(type: string, id: string, token: string | null) {
  return request<void>(`/api/content/${type}/${id}`, {
    method: 'DELETE',
    token,
  });
}

export async function fetchAllContent(token: string | null) {
  const [postsRes, pagesRes] = await Promise.all([
    request<ContentEntry[]>('/api/content/post', { token }),
    request<ContentEntry[]>('/api/content/page', { token }),
  ]);

  const all: ContentEntry[] = [...(postsRes.data ?? []), ...(pagesRes.data ?? [])];
  return {
    data: all,
    meta: {
      total: all.length,
      page: 1,
      pageSize: all.length,
      totalPages: 1,
    },
  };
}
