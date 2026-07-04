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

/**
 * A page entry — same shape as ContentEntry but typed for clarity.
 */
export interface PageEntry {
  id: string;
  type: 'page';
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

/** A content author */
export interface Author {
  id: string;
  name: string;
  slug: string;
  bio: string;
  avatarUrl: string;
  email: string;
  socialLinks: Record<string, string>;
  postCount: number;
  createdAt: string;
}

/** Tag is an alias for Term with taxonomy="tag" */
export type Tag = Term;

/** Category is an alias for Term with taxonomy="category" */
export type Category = Term;

/** A year/month archive entry */
export interface ArchiveEntry {
  year: number;
  month: number;
  count: number;
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

/**
 * Fetch all terms in the "tag" taxonomy.
 */
export async function getTags(): Promise<Term[]> {
  try {
    const data = await fetchApi<PaginatedResult<Term>>('/api/taxonomy?taxonomy=tag&limit=100');
    return data.items;
  } catch {
    // Tags are non‑critical
    return [];
  }
}

/**
 * Get a single category term by slug.
 */
export async function getCategory(slug: string): Promise<Term | null> {
  try {
    const categories = await getCategories();
    return categories.find((c) => c.slug === slug) ?? null;
  } catch {
    return null;
  }
}

/**
 * Get a single tag term by slug.
 */
export async function getTag(slug: string): Promise<Term | null> {
  try {
    const tags = await getTags();
    return tags.find((t) => t.slug === slug) ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Pages API
// ---------------------------------------------------------------------------

export interface GetPagesParams {
  limit?: number;
  page?: number;
  status?: string;
}

/**
 * Fetch published content entries of type "page".
 */
export async function getPages(params: GetPagesParams = {}): Promise<PaginatedResult<PageEntry>> {
  const search = new URLSearchParams();
  search.set('status', params.status ?? 'publish');
  if (params.limit) search.set('limit', String(params.limit));
  if (params.page) search.set('page', String(params.page));

  return fetchApi<PaginatedResult<PageEntry>>(`/api/content/page?${search.toString()}`);
}

/**
 * Fetch a single page by its slug.
 */
export async function getPage(slug: string): Promise<PageEntry | null> {
  try {
    const result = await getPages({ limit: 100 });
    return result.items.find((p) => p.slug === slug) ?? null;
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Authors API
// ---------------------------------------------------------------------------

/**
 * Fetch a single author by slug.
 *
 * Note: The API may not have a dedicated authors endpoint, so this falls back
 * to returning mock data that callers can safely destructure against.
 */
export async function getAuthor(slug: string): Promise<Author | null> {
  const mockAuthors: Record<string, Author> = {
    admin: {
      id: 'author-1',
      name: 'Admin',
      slug: 'admin',
      bio: 'Site administrator and content manager.',
      avatarUrl: '',
      email: '',
      socialLinks: {},
      postCount: 0,
      createdAt: new Date().toISOString(),
    },
  };

  try {
    const result = await getPosts({ limit: 1 });
    const post = result.items[0];
    if (post?.authorId) {
      return {
        id: post.authorId,
        name: slug.charAt(0).toUpperCase() + slug.slice(1),
        slug,
        bio: '',
        avatarUrl: '',
        email: '',
        socialLinks: {},
        postCount: result.total,
        createdAt: new Date().toISOString(),
      };
    }
  } catch {
    // Fall through to mock
  }

  return (
    mockAuthors[slug] ?? {
      id: `author-${slug}`,
      name: slug.charAt(0).toUpperCase() + slug.slice(1),
      slug,
      bio: '',
      avatarUrl: '',
      email: '',
      socialLinks: {},
      postCount: 0,
      createdAt: new Date().toISOString(),
    }
  );
}

// ---------------------------------------------------------------------------
// Search API
// ---------------------------------------------------------------------------

export interface SearchPostsParams {
  limit?: number;
  page?: number;
  status?: string;
}

/**
 * Search posts by query string.
 *
 * Attempts to use a server‑side search parameter if the API supports it,
 * otherwise falls back to client‑side filtering of all published posts.
 */
export async function searchPosts(
  query: string,
  params: SearchPostsParams = {},
): Promise<PaginatedResult<ContentEntry>> {
  const q = query.trim();
  if (!q) {
    return getPosts(params);
  }

  const search = new URLSearchParams();
  search.set('status', params.status ?? 'publish');
  search.set('limit', String(params.limit ?? 100));
  if (params.page) search.set('page', String(params.page));

  try {
    return await fetchApi<PaginatedResult<ContentEntry>>(
      `/api/content/post?${search.toString()}&search=${encodeURIComponent(q)}`,
    );
  } catch {
    // API doesn't support search param — filter client‑side
  }

  try {
    const all = await getPosts({ limit: 100, status: params.status });
    const lower = q.toLowerCase();
    const items = all.items.filter(
      (p) =>
        p.title.toLowerCase().includes(lower) ||
        p.excerpt.toLowerCase().includes(lower) ||
        p.content.toLowerCase().includes(lower),
    );
    return { items, total: items.length, page: params.page ?? 1, limit: params.limit ?? 100 };
  } catch {
    return { items: [], total: 0, page: 1, limit: 100 };
  }
}

// ---------------------------------------------------------------------------
// Taxonomy‑based post queries
// ---------------------------------------------------------------------------

/**
 * Get posts that belong to a specific category (by slug).
 */
export async function getPostsByCategory(
  slug: string,
  params: GetPostsParams = {},
): Promise<PaginatedResult<ContentEntry>> {
  try {
    const search = new URLSearchParams();
    search.set('status', params.status ?? 'publish');
    if (params.limit) search.set('limit', String(params.limit));
    if (params.page) search.set('page', String(params.page));
    search.set('category', slug);

    return await fetchApi<PaginatedResult<ContentEntry>>(`/api/content/post?${search.toString()}`);
  } catch {
    // API doesn't support category filter — do it client‑side
  }

  try {
    const all = await getPosts({ limit: 100, status: params.status });
    const items = all.items.filter((p) => p.tags.includes(slug));
    return { items, total: items.length, page: params.page ?? 1, limit: params.limit ?? 100 };
  } catch {
    return { items: [], total: 0, page: 1, limit: 100 };
  }
}

/**
 * Get posts that have a specific tag (by slug).
 */
export async function getPostsByTag(
  slug: string,
  params: GetPostsParams = {},
): Promise<PaginatedResult<ContentEntry>> {
  try {
    const search = new URLSearchParams();
    search.set('status', params.status ?? 'publish');
    if (params.limit) search.set('limit', String(params.limit));
    if (params.page) search.set('page', String(params.page));
    search.set('tag', slug);

    return await fetchApi<PaginatedResult<ContentEntry>>(`/api/content/post?${search.toString()}`);
  } catch {
    // API doesn't support tag filter — do it client‑side
  }

  try {
    const all = await getPosts({ limit: 100, status: params.status });
    const items = all.items.filter((p) => p.tags.includes(slug));
    return { items, total: items.length, page: params.page ?? 1, limit: params.limit ?? 100 };
  } catch {
    return { items: [], total: 0, page: 1, limit: 100 };
  }
}

// ---------------------------------------------------------------------------
// Date‑based post queries
// ---------------------------------------------------------------------------

/**
 * Get posts published on a specific date (year, optional month, optional day).
 */
export async function getPostsByDate(
  year: number,
  month?: number,
  day?: number,
  params: GetPostsParams = {},
): Promise<PaginatedResult<ContentEntry>> {
  try {
    const search = new URLSearchParams();
    search.set('status', params.status ?? 'publish');
    if (params.limit) search.set('limit', String(params.limit));
    if (params.page) search.set('page', String(params.page));
    search.set('year', String(year));
    if (month != null) search.set('month', String(month));
    if (day != null) search.set('day', String(day));

    return await fetchApi<PaginatedResult<ContentEntry>>(`/api/content/post?${search.toString()}`);
  } catch {
    // API doesn't support date filter — do it client‑side
  }

  try {
    const all = await getPosts({ limit: 200, status: params.status });
    const items = all.items.filter((p) => {
      if (!p.publishedAt) return false;
      const d = new Date(p.publishedAt);
      if (d.getFullYear() !== year) return false;
      if (month != null && d.getMonth() + 1 !== month) return false;
      if (day != null && d.getDate() !== day) return false;
      return true;
    });
    return { items, total: items.length, page: params.page ?? 1, limit: params.limit ?? 100 };
  } catch {
    return { items: [], total: 0, page: 1, limit: 100 };
  }
}

/**
 * Get posts written by a specific author (by author ID).
 */
export async function getPostsByAuthor(
  authorId: string,
  params: GetPostsParams = {},
): Promise<PaginatedResult<ContentEntry>> {
  try {
    const search = new URLSearchParams();
    search.set('status', params.status ?? 'publish');
    if (params.limit) search.set('limit', String(params.limit));
    if (params.page) search.set('page', String(params.page));
    search.set('author', authorId);

    return await fetchApi<PaginatedResult<ContentEntry>>(`/api/content/post?${search.toString()}`);
  } catch {
    // API doesn't support author filter — do it client‑side
  }

  try {
    const all = await getPosts({ limit: 200, status: params.status });
    const items = all.items.filter((p) => p.authorId === authorId);
    return { items, total: items.length, page: params.page ?? 1, limit: params.limit ?? 100 };
  } catch {
    return { items: [], total: 0, page: 1, limit: 100 };
  }
}

// ---------------------------------------------------------------------------
// Archive API
// ---------------------------------------------------------------------------

/**
 * Get archive data — a list of year/month pairs with post counts.
 *
 * Note: The API may not have a dedicated archive endpoint, so this falls back
 * to building the archive from published posts.
 */
export async function getArchive(): Promise<ArchiveEntry[]> {
  try {
    return await fetchApi<ArchiveEntry[]>('/api/content/archive');
  } catch {
    // Archive endpoint not available — build from posts
  }

  try {
    const all = await getPosts({ limit: 500 });
    const map = new Map<string, ArchiveEntry>();

    for (const post of all.items) {
      if (!post.publishedAt) continue;
      const d = new Date(post.publishedAt);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      const entry = map.get(key);
      if (entry) {
        entry.count++;
      } else {
        map.set(key, { year: d.getFullYear(), month: d.getMonth() + 1, count: 1 });
      }
    }

    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
  } catch {
    return [];
  }
}
