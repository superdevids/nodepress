import Link from 'next/link';
import { Container, Heading, Text } from '@nodepressjs/ui';
import { searchPosts, getPosts } from '@/lib/api';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { SearchForm } from '@/components/search-form';
import { PostList } from '@/components/post-list';
import { Pagination } from '@/components/pagination';
import type { Metadata } from 'next';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SearchPageProps {
  searchParams: { q?: string; page?: string };
}

// ---------------------------------------------------------------------------
// Metadata
// ---------------------------------------------------------------------------

export async function generateMetadata({ searchParams }: SearchPageProps): Promise<Metadata> {
  const query = searchParams?.q?.trim();

  if (!query) {
    return {
      title: 'Search',
      description: 'Search through all blog posts and content.',
    };
  }

  const title = `Search: "${query}" — NodePress`;
  const description = `Search results for "${query}". Browse matching blog posts and content.`;

  return {
    title: `Search: "${query}"`,
    description,
    openGraph: {
      title,
      description,
      url: `/search?q=${encodeURIComponent(query)}`,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    robots: {
      index: false,
      follow: true,
    },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Highlight occurrences of a search term within a text string using <mark>.
 */
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query || query.length < 2) return text;

  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);

  if (parts.length === 1) return text;

  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-wp-accent/20 text-wp-text rounded-sm px-0.5">
        {part}
      </mark>
    ) : (
      part
    ),
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const query = searchParams?.q?.trim() ?? '';
  const currentPage = Number(searchParams?.page) || 1;
  const limit = 9;

  // Fetch search results
  const postsResult = query
    ? await searchPosts(query, { page: currentPage, limit })
    : await getPosts({ page: currentPage, limit });

  const { items: posts, total, limit: pageSize } = postsResult;
  const totalPages = Math.ceil(total / pageSize);

  return (
    <Container className="py-12 sm:py-16">
      {/* Breadcrumbs */}
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Search' }]} className="mb-6" />

      {/* Page header */}
      <Heading level={1}>
        {query ? <>Search results for &ldquo;{query}&rdquo;</> : 'Search'}
      </Heading>
      <Text color="muted" size="lg" className="mt-2">
        {query
          ? `${total} ${total === 1 ? 'result' : 'results'} found`
          : 'Browse all published content.'}
      </Text>

      {/* Search form — large variant */}
      <div className="mb-12 mt-8 max-w-xl">
        <SearchForm large placeholder="Search articles..." className="w-full" />
      </div>

      {/* Results */}
      {posts.length > 0 ? (
        <>
          {query ? (
            <div className="space-y-4">
              {posts.map((post) => (
                <article
                  key={post.id}
                  className="border-wp-border bg-card hover:shadow-wp-popover group rounded-lg border p-5 transition-shadow"
                >
                  <Link href={`/blog/${post.slug}`} className="no-underline">
                    <h3 className="text-wp-text group-hover:text-wp-primary text-lg font-semibold transition-colors">
                      {query ? highlightMatches(post.title, query) : post.title}
                    </h3>
                  </Link>
                  {post.excerpt && (
                    <p className="text-wp-text-light mt-2 line-clamp-2 text-sm leading-relaxed">
                      {query ? highlightMatches(post.excerpt, query) : post.excerpt}
                    </p>
                  )}
                  <div className="text-wp-text-light mt-3 flex items-center gap-3 text-xs">
                    {post.publishedAt && (
                      <time dateTime={post.publishedAt}>
                        {new Date(post.publishedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </time>
                    )}
                    <span>
                      {post.tags.length} {post.tags.length === 1 ? 'tag' : 'tags'}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <PostList posts={posts} variant="grid" columns={3} emptyMessage="No posts found." />
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              basePath="/search"
              queryParams={query ? { q: query } : undefined}
              className="mt-12"
              showSummary
              total={total}
            />
          )}
        </>
      ) : (
        /* No results state */
        <div className="border-wp-border bg-wp-bg-light/50 mt-8 rounded-lg border py-16 text-center">
          <div className="bg-wp-bg-light mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full">
            <svg
              className="text-wp-text-light h-8 w-8"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>

          {query ? (
            <>
              <Heading level={2} className="text-wp-text">
                No results found for &ldquo;{query}&rdquo;
              </Heading>
              <Text color="muted" className="mx-auto mt-3 max-w-md">
                Try adjusting your search. Here are some suggestions:
              </Text>
              <ul className="mt-4 space-y-2 text-sm">
                <li>
                  <Text color="muted" as="span">
                    ✓ Check your spelling for typos
                  </Text>
                </li>
                <li>
                  <Text color="muted" as="span">
                    ✓ Try different or more general keywords
                  </Text>
                </li>
                <li>
                  <Text color="muted" as="span">
                    ✓ Browse{' '}
                    <Link
                      href="/blog"
                      className="text-wp-primary hover:text-wp-primary-hover underline underline-offset-4"
                    >
                      all posts
                    </Link>{' '}
                    instead
                  </Text>
                </li>
                <li>
                  <Text color="muted" as="span">
                    ✓{' '}
                    <Link
                      href="/category"
                      className="text-wp-primary hover:text-wp-primary-hover underline underline-offset-4"
                    >
                      Browse categories
                    </Link>{' '}
                    to find related content
                  </Text>
                </li>
              </ul>
            </>
          ) : (
            <>
              <Heading level={2} className="text-wp-text">
                No posts found
              </Heading>
              <Text color="muted" className="mx-auto mt-3 max-w-md">
                There are no published posts yet. Check back later or visit the blog.
              </Text>
              <div className="mt-6">
                <Link
                  href="/blog"
                  className="text-wp-primary hover:text-wp-primary-hover text-sm font-medium underline underline-offset-4"
                >
                  ← Back to Blog
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </Container>
  );
}
