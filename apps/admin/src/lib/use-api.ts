'use client';

/**
 * NodePress `useApi` hook.
 *
 * Provides a React hook that reads the Bearer token from AuthContext
 * and returns convenience API methods (get, post, patch, del, upload).
 *
 * Normalizes response formats from the NestJS API to `ApiResponse<T>`.
 *
 * For direct (non-hook) API access, use `getApiClient()` from `@/lib/api-client`.
 */

export { ApiClient, getApiClient, createApiClient, ApiClientError } from './api-client';
export type { ApiError, ApiClientOptions } from './api-client';

import { useAuth } from '@/lib/auth';
import { env } from '@/lib/env';

export interface ApiMeta {
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: ApiMeta;
}

/**
 * Normalize the raw API JSON response into our ApiResponse<T> format.
 * Handles NestJS paginated, bare array, bare object, and pre-wrapped responses.
 */
function normalizeResponse<T>(json: unknown): ApiResponse<T> {
  // NestJS paginated format: { items: [...], total, page, limit }
  if (json && typeof json === 'object' && 'items' in json && Array.isArray((json as Record<string, unknown>).items)) {
    const r = json as { items: T; total: number; page: number; limit: number };
    return {
      data: r.items,
      meta: {
        total: r.total,
        page: r.page,
        pageSize: r.limit,
        totalPages: Math.ceil(r.total / r.limit),
      },
    };
  }

  // Pre-wrapped format: { data: T }
  if (json && typeof json === 'object' && 'data' in (json as Record<string, unknown>)) {
    return json as ApiResponse<T>;
  }

  // Bare array: [ ... ]
  if (Array.isArray(json)) {
    return { data: json as T };
  }

  // Bare object/primitive: { ... }
  return { data: json as T };
}

/**
 * React hook that returns convenience API methods.
 * The Bearer token is automatically read from AuthContext.
 */
export function useApi() {
  const { token } = useAuth();
  const baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  const controller = new AbortController();
  const TIMEOUT_MS = 30000;

  async function request<T>(
    method: string,
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (body !== undefined && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    // Timeout via AbortController
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const combinedSignal = signal
      ? combineSignals(signal, controller.signal)
      : controller.signal;

    try {
      const res = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        body:
          body instanceof FormData
            ? body
            : body !== undefined
              ? JSON.stringify(body)
              : undefined,
        signal: combinedSignal,
      });

      if (!res.ok) {
        // 401 → redirect to login
        if (res.status === 401 && typeof window !== 'undefined') {
          try { localStorage.removeItem('np_token'); } catch { /* noop */ }
          // Don't redirect during upload calls or background fetches
          if (!signal?.aborted) {
            window.location.href = '/admin/login';
          }
        }
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.message || `API Error: ${res.status} ${res.statusText}`);
      }

      if (res.status === 204) {
        return { data: undefined as T };
      }

      const json = await res.json();
      return normalizeResponse<T>(json);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('Request timed out or was cancelled');
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  function get<T>(path: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
    return request<T>('GET', path, undefined, signal);
  }

  function post<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<ApiResponse<T>> {
    return request<T>('POST', path, body, signal);
  }

  function patch<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<ApiResponse<T>> {
    return request<T>('PATCH', path, body, signal);
  }

  function del<T>(path: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
    return request<T>('DELETE', path, undefined, signal);
  }

  /**
   * Upload a file via multipart/form-data with progress tracking using XMLHttpRequest.
   */
  function upload<T>(
    path: string,
    formData: FormData,
    onProgress?: (pct: number) => void,
    signal?: AbortSignal,
  ): Promise<ApiResponse<T>> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const url = `${baseUrl}${path}`;
      let timedOut = false;

      const timeoutId = setTimeout(() => {
        timedOut = true;
        xhr.abort();
        reject(new Error('Upload timed out'));
      }, 120000); // 120s for uploads

      xhr.open('POST', url);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress && !timedOut) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        clearTimeout(timeoutId);
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const raw = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            resolve(normalizeResponse<T>(raw));
          } else {
            const body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            reject(new Error(body.message || `Upload failed: ${xhr.status}`));
          }
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => {
        clearTimeout(timeoutId);
        reject(new Error('Network error during upload'));
      });

      xhr.addEventListener('abort', () => {
        clearTimeout(timeoutId);
        if (!timedOut) reject(new Error('Upload aborted'));
      });

      if (signal) {
        signal.addEventListener('abort', () => xhr.abort());
      }

      xhr.send(formData);
    });
  }

  return { get, post, patch, del, upload, baseUrl };
}

function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const sig of signals) {
    if (sig.aborted) {
      controller.abort(sig.reason);
      return controller.signal;
    }
    sig.addEventListener('abort', () => controller.abort(sig.reason), { once: true });
  }
  return controller.signal;
}
