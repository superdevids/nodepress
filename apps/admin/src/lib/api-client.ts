/**
 * NodePress API Client
 *
 * Typed HTTP client for interacting with the NodePress Core API.
 * Handles authentication, token refresh, and request/response serialization.
 */

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface ApiClientOptions {
  baseUrl: string;
  token?: string;
  refreshToken?: string;
  onTokenRefresh?: (token: string, refreshToken: string) => void;
}

interface ApiError {
  status: number;
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

interface ApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

class ApiClientError extends Error {
  public status: number;
  public code: string;
  public details?: Record<string, string[]>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = 'ApiClientError';
    this.status = error.status;
    this.code = error.code;
    this.details = error.details;
  }
}

export class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private refreshToken: string | null = null;
  private onTokenRefresh?: (token: string, refreshToken: string) => void;
  private refreshPromise: Promise<void> | null = null;

  constructor(options: ApiClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '');
    this.token = options.token ?? null;
    this.refreshToken = options.refreshToken ?? null;
    this.onTokenRefresh = options.onTokenRefresh;
  }

  setTokens(token: string, refreshToken: string) {
    this.token = token;
    this.refreshToken = refreshToken;
  }

  clearTokens() {
    this.token = null;
    this.refreshToken = null;
  }

  get isAuthenticated(): boolean {
    return this.token !== null;
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    options?: { signal?: AbortSignal },
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}/api${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: options?.signal,
    });

    // Handle 401 — attempt token refresh once
    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      headers['Authorization'] = `Bearer ${this.token}`;
      const retryResponse = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: options?.signal,
      });
      return this.handleResponse<T>(retryResponse);
    }

    return this.handleResponse<T>(response);
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiClientError({
        status: response.status,
        code: body.code ?? 'UNKNOWN_ERROR',
        message: body.message ?? response.statusText,
        details: body.details,
      });
    }

    if (response.status === 204) {
      return { data: undefined as T };
    }

    return response.json() as Promise<ApiResponse<T>>;
  }

  private async refreshAccessToken(): Promise<void> {
    // Deduplicate concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      const response = await fetch(`${this.baseUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        this.clearTokens();
        throw new ApiClientError({
          status: 401,
          code: 'TOKEN_REFRESH_FAILED',
          message: 'Unable to refresh authentication token',
        });
      }

      const { data } = (await response.json()) as {
        data: { token: string; refreshToken: string };
      };
      this.token = data.token;
      this.refreshToken = data.refreshToken;
      this.onTokenRefresh?.(data.token, data.refreshToken);
    })();

    try {
      await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  // ─── HTTP verb methods ──────────────────────────────────

  get<T>(path: string, options?: { signal?: AbortSignal }) {
    return this.request<T>('GET', path, undefined, options);
  }

  post<T>(path: string, body?: unknown, options?: { signal?: AbortSignal }) {
    return this.request<T>('POST', path, body, options);
  }

  put<T>(path: string, body?: unknown, options?: { signal?: AbortSignal }) {
    return this.request<T>('PUT', path, body, options);
  }

  patch<T>(path: string, body?: unknown, options?: { signal?: AbortSignal }) {
    return this.request<T>('PATCH', path, body, options);
  }

  delete<T>(path: string, options?: { signal?: AbortSignal }) {
    return this.request<T>('DELETE', path, undefined, options);
  }
}

// ─── Singleton instance ───────────────────────────────────

let clientInstance: ApiClient | null = null;

export function getApiClient(): ApiClient {
  if (!clientInstance) {
    clientInstance = new ApiClient({
      baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001',
    });
  }
  return clientInstance;
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  clientInstance = new ApiClient(options);
  return clientInstance;
}

export { ApiClientError };
export type { ApiResponse, ApiError, ApiClientOptions };
