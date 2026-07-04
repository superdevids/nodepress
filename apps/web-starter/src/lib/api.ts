/**
 * NodePress API Client
 *
 * Typed API calls for the web starter theme.
 * All responses are wrapped in `{ success, data, meta?, timestamp }` by the API's TransformInterceptor.
 * This module unwraps that envelope and returns typed data.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Raw API response envelope from the TransformInterceptor */
export interface ApiResponseEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
  timestamp: string;
}

/** Paginated list returned by content & taxonomy endpoints */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

/** A content entry (post, page, etc.) from the REST API */
export interface ContentEntry {
  id: string;
  type: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'publish' | 'pending' | 'private';
  featured: boolean;
  tags: string[];
  parentId: string | null;
  authorId: string;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

/** Site-wide settings from GET /api/settings/general */
export interface SiteSettings {
  siteTitle?: string;
  tagline?: string;
  siteUrl?: string;
  adminEmail?: string;
  language?: string;
  timezone?: string;
  dateFormat?: string;
  [key: string]: unknown;
}

/** A taxonomy term (category, tag, etc.) */
export interface Term {
  id: string;
  taxonomy: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  count: number;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Internal fetch wrapper
// ---------------------------------------------------------------------------

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${API_URL}${path}`;

  let res: Response;
  try {
    res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...((options?.headers as Record<string, string>) ?? {}),
      },
      next: { revalidate: 60 },
    });
  } catch (err) {
    throw new ApiError(
      `Network error fetching ${url}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(
      `API ${res.status} ${res.statusText} — ${path}${body ? `: ${body.slice(0, 200)}` : ''}`,
      res.status,
    );
  }

  let json: ApiResponseEnvelope<T>;
  try {
    json = (await res.json()) as ApiResponseEnvelope<T>;
  } catch (err) {
    throw new ApiError(`Invalid JSON response from ${path}`);
  }

  if (!json.success) {
    throw new ApiError(`API returned success=false from ${path}`, res.status, (json as any).code);
  }

  return json.data;
}

// ---------------------------------------------------------------------------
// Content API
// ---------------------------------------------------------------------------

export interface GetPostsParams {
  limit?: number;
  page?: number;
  status?: string;
}

/**
 * Fetch published content entries of type "post".
 */
export async function getPosts(
  params: GetPostsParams = {},
): Promise<PaginatedResult<ContentEntry>> {
  const search = new URLSearchParams();
  search.set('status', params.status ?? 'publish');
  if (params.limit) search.set('limit', String(params.limit));
  if (params.page) search.set('page', String(params.page));

  return fetchApi<PaginatedResult<ContentEntry>>(`/api/content/post?${search.toString()}`);
}

/**
 * Fetch a single post by its slug.
 *
 * Note: The current API does not support slug-based lookup, so we fetch
 * a page of posts and filter client‑side. This is fine for small sites.
 * For larger sites, add a `slug` query parameter to the API controller.
 */
export async function getPost(slug: string): Promise<ContentEntry | null> {
  const result = await getPosts({ limit: 100 });
  return result.items.find((p) => p.slug === slug) ?? null;
}

// ---------------------------------------------------------------------------
// Settings API
// ---------------------------------------------------------------------------

/**
 * Fetch the "general" settings group (siteTitle, tagline, etc.).
 */
export async function getSiteSettings(): Promise<SiteSettings | null> {
  try {
    const data = await fetchApi<{
      group: string;
      values: SiteSettings;
      updatedAt: string;
    }>('/api/settings/general');
    return data.values;
  } catch (err) {
    // Settings are non‑critical — return null and let consumers handle it
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Taxonomy API
// ---------------------------------------------------------------------------

/**
 * Fetch all terms in the "category" taxonomy.
 */
export async function getCategories(): Promise<Term[]> {
  try {
    const data = await fetchApi<PaginatedResult<Term>>('/api/taxonomy?taxonomy=category&limit=100');
    return data.items;
  } catch {
    // Categories are non‑critical
    return [];
  }
}
