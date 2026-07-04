'use client';

/**
 * NodePress `useApi` hook.
 *
 * This module re-exports the canonical API client from `@/lib/api-client`
 * and provides a convenience React hook that reads the Bearer token from
 * AuthContext.
 *
 * ⚠️ For direct API access without a hook, use `getApiClient()` from
 * `@/lib/api-client` instead.
 */

export { ApiClient, getApiClient, createApiClient, ApiClientError } from './api-client';
export type { ApiError, ApiClientOptions } from './api-client';

import { useAuth } from '@/lib/auth';
import { env } from '@/lib/env';

export interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

/**
 * React hook that returns convenience API methods.
 * The Bearer token is automatically read from AuthContext.
 */
export function useApi() {
  const { token } = useAuth();
  const baseUrl = env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

  async function getHeaders(multipart = false): Promise<Record<string, string>> {
    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    if (!multipart) {
      headers['Content-Type'] = 'application/json';
    }
    return headers;
  }

  async function handleResponse<T>(res: Response): Promise<ApiResponse<T>> {
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || `API Error: ${res.status} ${res.statusText}`);
    }
    if (res.status === 204) return { data: undefined as T };
    return res.json();
  }

  async function get<T>(path: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
    const headers = await getHeaders();
    const res = await fetch(`${baseUrl}${path}`, { method: 'GET', headers, signal });
    return handleResponse<T>(res);
  }

  async function post<T>(
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<ApiResponse<T>> {
    const headers = await getHeaders();
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'POST',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    return handleResponse<T>(res);
  }

  async function patch<T>(
    path: string,
    body?: unknown,
    signal?: AbortSignal,
  ): Promise<ApiResponse<T>> {
    const headers = await getHeaders();
    const res = await fetch(`${baseUrl}${path}`, {
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal,
    });
    return handleResponse<T>(res);
  }

  async function del<T>(path: string, signal?: AbortSignal): Promise<ApiResponse<T>> {
    const headers = await getHeaders();
    const res = await fetch(`${baseUrl}${path}`, { method: 'DELETE', headers, signal });
    return handleResponse<T>(res);
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

      xhr.open('POST', url);

      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        try {
          if (xhr.status >= 200 && xhr.status < 300) {
            const data = xhr.responseText ? JSON.parse(xhr.responseText) : { data: undefined };
            resolve(data);
          } else {
            const body = xhr.responseText ? JSON.parse(xhr.responseText) : {};
            reject(new Error(body.message || `Upload failed: ${xhr.status}`));
          }
        } catch {
          reject(new Error(`Upload failed: ${xhr.status}`));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
      xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

      if (signal) {
        signal.addEventListener('abort', () => xhr.abort());
      }

      xhr.send(formData);
    });
  }

  return { get, post, patch, del, upload, baseUrl };
}
