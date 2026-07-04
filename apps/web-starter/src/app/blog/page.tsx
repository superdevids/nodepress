import { Container, Heading, Text } from '@nodepressjs/ui';
import { PostList } from '@/components/post-list';
import { Pagination } from '@/components/pagination';
import { Sidebar } from '@/components/sidebar';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SearchForm } from '@/components/search-form';
import { getPosts, getCategories, getTags } from '@/lib/api';
import Link from 'next/link';
import type { Metadata } from 'next';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Blog',
    description: 'Read the latest articles and updates from NodePress.',
    openGraph: {
      title: 'Blog — NodePress',
      description: 'Read the latest articles and updates from NodePress.',
      type: 'website',
      url: '/blog',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Blog — NodePress',
      description: 'Read the latest articles and updates from NodePress.',
    },
  };
}

interface BlogPageProps {
  searchParams: {
    page?: string;
    category?: string;
    tag?: string;
    order?: string;
    sort?: string;
    view?: string;
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = searchParams ?? {};
  const currentPage = Number(params.page) || 1;
  const currentCategory = params.category || '';
  const currentTag = params.tag || '';
  const currentSort = params.sort || 'date';
  const currentView = params.view || 'grid';
  const limit = 9;

  // Fetch posts, categories, and tags in parallel
  const [postsResult, categories, tags] = await Promise.all([
    getPosts({ page: currentPage, limit }),
    getCategories(),
    getTags(),
  ]);

  const { items: posts, total, limit: pageSize } = postsResult;
  const totalPages = Math.ceil(total / pageSize);

  // Filter posts by category or tag if selected (client-side fallback)
  let filteredPosts = [...posts];
  if (currentCategory) {
    filteredPosts = filteredPosts.filter((post) => post.tags.includes(currentCategory));
  }
  if (currentTag) {
    filteredPosts = filteredPosts.filter((post) => post.tags.includes(currentTag));
  }

  // Sort posts
  if (currentSort === 'title') {
    filteredPosts.sort((a, b) => a.title.localeCompare(b.title));
  } else {
    // Default: sort by date descending
    filteredPosts.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });
  }

  // Build query params for pagination (preserve filters)
  const paginationQueryParams: Record<string, string> = {};
  if (currentCategory) paginationQueryParams.category = currentCategory;
  if (currentTag) paginationQueryParams.tag = currentTag;
  if (currentSort !== 'date') paginationQueryParams.sort = currentSort;
  if (currentView !== 'grid') paginationQueryParams.view = currentView;

  // Build URL helper for filter links (resets to page 1 when filters change)
  function buildFilterUrl(overrides: Record<string, string | undefined>): string {
    const merged: Record<string, string> = {};
    if (currentCategory) merged.category = currentCategory;
    if (currentTag) merged.tag = currentTag;
    if (currentSort !== 'date') merged.sort = currentSort;
    if (currentView !== 'grid') merged.view = currentView;
    for (const [key, value] of Object.entries(overrides)) {
      if (value === undefined) {
        delete merged[key];
      } else {
        merged[key] = value;
      }
    }
    // Page is intentionally omitted — reset to page 1 on filter change
    const qs = new URLSearchParams(merged).toString();
    return qs ? `/blog?${qs}` : '/blog';
  }

  const isActiveView = (view: string) => currentView === view;
  const isActiveSort = (sort: string) => currentSort === sort;

  return (
    <Container className="py-12 sm:py-16">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Blog' }]} className="mb-6" />

      {/* Page header */}
      <div className="mb-8">
        <Heading level={1}>Blog</Heading>
        <Text color="muted" size="lg" className="mt-2">
          Read the latest articles and updates from NodePress.
        </Text>
      </div>

      {/* Search bar */}
      <div className="mb-8 max-w-md">
        <SearchForm placeholder="Search posts..." />
      </div>

      {/* Filter bar */}
      <div className="mb-8 space-y-4">
        {/* Category filter pills */}
        {categories.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-2"
            role="navigation"
            aria-label="Category filter"
          >
            <Link
              href={buildFilterUrl({ category: undefined })}
              className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                !currentCategory
                  ? 'bg-wp-primary text-wp-primary-text'
                  : 'bg-wp-bg-light text-wp-text-light hover:bg-wp-border-light'
              }`}
            >
              All
            </Link>
            {categories.map((cat) => {
              const isActive = cat.slug === currentCategory;
              return (
                <Link
                  key={cat.id}
                  href={
                    isActive
                      ? buildFilterUrl({ category: undefined })
                      : buildFilterUrl({ category: cat.slug })
                  }
                  className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-wp-primary text-wp-primary-text'
                      : 'bg-wp-bg-light text-wp-text-light hover:bg-wp-border-light'
                  }`}
                  aria-pressed={isActive}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        )}

        {/* Tag filter & Sort & View toggle */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Tag filter */}
          {tags.length > 0 && (
            <div
              className="flex flex-wrap items-center gap-2"
              role="navigation"
              aria-label="Tag filter"
            >
              <span className="text-wp-text-light text-xs font-medium uppercase tracking-wider">
                Tags:
              </span>
              <select
                value={currentTag || ''}
                onChange={() => {}}
                className="border-wp-border bg-background text-wp-text focus:ring-wp-accent rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2"
                aria-label="Filter by tag"
              >
                <option value="">All tags</option>
                {tags.map((tag) => (
                  <option key={tag.id} value={tag.slug}>
                    {tag.name} ({tag.count})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sort and View controls */}
          <div className="flex items-center gap-3">
            {/* Sort dropdown */}
            <div className="flex items-center gap-2">
              <label
                htmlFor="sort-select"
                className="text-wp-text-light text-xs font-medium uppercase tracking-wider"
              >
                Sort:
              </label>
              <Link
                href={buildFilterUrl({ sort: 'date' })}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActiveSort('date')
                    ? 'bg-wp-primary text-wp-primary-text'
                    : 'bg-wp-bg-light text-wp-text-light hover:bg-wp-border-light'
                }`}
                aria-pressed={isActiveSort('date')}
              >
                Date
              </Link>
              <Link
                href={buildFilterUrl({ sort: 'title' })}
                className={`inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  isActiveSort('title')
                    ? 'bg-wp-primary text-wp-primary-text'
                    : 'bg-wp-bg-light text-wp-text-light hover:bg-wp-border-light'
                }`}
                aria-pressed={isActiveSort('title')}
              >
                Title
              </Link>
            </div>

            {/* Grid/List toggle */}
            <div
              className="border-wp-border flex items-center gap-1 rounded-md border p-0.5"
              role="group"
              aria-label="View toggle"
            >
              <Link
                href={buildFilterUrl({ view: 'grid' })}
                className={`inline-flex items-center rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                  isActiveView('grid')
                    ? 'bg-wp-bg-light text-wp-text shadow-sm'
                    : 'text-wp-text-light hover:text-wp-text'
                }`}
                aria-pressed={isActiveView('grid')}
                aria-label="Grid view"
              >
                {/* Grid icon */}
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z"
                  />
                </svg>
              </Link>
              <Link
                href={buildFilterUrl({ view: 'list' })}
                className={`inline-flex items-center rounded px-2 py-1.5 text-sm font-medium transition-colors ${
                  isActiveView('list')
                    ? 'bg-wp-bg-light text-wp-text shadow-sm'
                    : 'text-wp-text-light hover:text-wp-text'
                }`}
                aria-pressed={isActiveView('list')}
                aria-label="List view"
              >
                {/* List icon */}
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
                  />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main content + Sidebar layout */}
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-10">
        {/* Main content */}
        <div>
          {/* Results count */}
          <div className="text-wp-text-light mb-4 text-sm">
            Showing {filteredPosts.length} of {total} post{total !== 1 ? 's' : ''}
          </div>

          {/* Posts grid/list */}
          {filteredPosts.length === 0 ? (
            <div className="border-wp-border bg-wp-bg-light/50 rounded-lg border py-16 text-center">
              <svg
                className="text-wp-text-light mx-auto mb-4 h-12 w-12"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m5.231 13.481L15 17.25m-4.5-15H5.625c-.621 0-1.125.504-1.125 1.125v16.5c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9zm3.75 11.625a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              <Heading level={3} className="text-wp-text-light">
                {currentCategory
                  ? `No posts in "${currentCategory}"`
                  : currentTag
                    ? `No posts tagged "${currentTag}"`
                    : 'No posts yet'}
              </Heading>
              <Text color="muted" className="mt-2">
                {currentCategory || currentTag
                  ? 'Try a different filter or check back later.'
                  : 'Create your first post in the admin panel.'}
              </Text>
              {(currentCategory || currentTag) && (
                <div className="mt-4">
                  <Link
                    href="/blog"
                    className="text-wp-primary hover:text-wp-primary-hover text-sm"
                  >
                    &larr; View all posts
                  </Link>
                </div>
              )}
            </div>
          ) : currentView === 'list' ? (
            /* List view */
            <div className="flex flex-col gap-3">
              {filteredPosts.map((post) => (
                <Link
                  key={post.id}
                  href={`/blog/${post.slug}`}
                  className="border-wp-border hover:bg-wp-bg-light/50 group flex items-center gap-4 rounded-lg border px-4 py-3 no-underline transition-colors"
                >
                  {/* Gradient placeholder dot */}
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-500/30 via-purple-500/30 to-pink-500/30"
                    aria-hidden="true"
                  >
                    <span className="text-wp-text-light select-none text-sm font-bold opacity-50">
                      {post.title.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-wp-text group-hover:text-wp-primary truncate text-sm font-medium transition-colors">
                      {post.title}
                    </h3>
                    <div className="text-wp-text-light mt-0.5 flex items-center gap-2 text-xs">
                      {post.publishedAt && (
                        <time dateTime={post.publishedAt}>
                          {new Date(post.publishedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </time>
                      )}
                      {post.tags.length > 0 && (
                        <span className="text-wp-text-light/50">&middot;</span>
                      )}
                      {post.tags.slice(0, 2).map((tag) => (
                        <span key={tag} className="text-wp-primary/70">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <svg
                    className="text-wp-text-light group-hover:text-wp-text h-4 w-4 flex-shrink-0 transition-colors"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M8.25 4.5l7.5 7.5-7.5 7.5"
                    />
                  </svg>
                </Link>
              ))}
            </div>
          ) : (
            /* Grid view */
            <PostList
              posts={filteredPosts}
              variant="grid"
              columns={3}
              emptyMessage=""
              className=""
            />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath="/blog"
              queryParams={paginationQueryParams}
              showSummary
              total={total}
              className="mt-12"
            />
          )}
        </div>

        {/* Sidebar */}
        <aside className="mt-12 lg:mt-0">
          <Sidebar
            categories={categories}
            tags={tags}
            recentPosts={undefined}
            archiveData={undefined}
          />
        </aside>
      </div>
    </Container>
  );
}
